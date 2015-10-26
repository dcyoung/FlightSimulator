
var gl;
var canvas = document.getElementById("myGLCanvas");
var shaderProgram;
var vertexPositionBuffer;


// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var viewDirStart = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var upStart = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

var horizontalViewingAngle = 25;
var verticleViewingAngle = -75;

var throttle = 0;
var minSpeed = 0.001;
var maxSpeed = 0.01;
var displacementVector =  vec3.create();


//pointer lock object forking for cross browser
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
canvas.onclick = function() {canvas.requestPointerLock();}

//Hook pointer lock state change events for different browsers
document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
function lockChangeAlert() {
  if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
	  console.log('The pointer lock status is now locked');
	  document.addEventListener("mousemove", mouseLoop, false);
  } else {
	  console.log('The pointer lock status is now unlocked');  
	  document.removeEventListener("mousemove", mouseLoop, false);
  }
}
function mouseLoop(e) {
	var movementX = e.movementX || e.mozMovementX || 0;
	var movementY = e.movementY || e.mozMovementY || 0;
	console.log("X movement: " + movementX + ', Y movement: ' + movementY);
}

//-------------------------------------------------------------------------
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN=Math.pow(2,5); //has to be a power of 2 for the diamond square algorithm to wor
    var gridMaxCoordinate = 1;
    
    var numT = terrainFromIteration(gridN, -gridMaxCoordinate,gridMaxCoordinate,-gridMaxCoordinate,gridMaxCoordinate, vTerrain, fTerrain, nTerrain);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
    
     
}

//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
function updateHorizontalAngle(angle){
    horizontalViewingAngle = angle;
    document.getElementById('horizontalAngleValueDisplay').value = angle; 
}

//----------------------------------------------------------------------------------
function updateVerticleAngle(angle){
    verticleViewingAngle = angle;
    document.getElementById('verticleAngleValueDisplay').value = angle; 
}

function updateThrottle(throttleInput){
	throttle = throttleInput;
	document.getElementById('throttleValueDisplay').value = throttle;
}


//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(verticleViewingAngle));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(horizontalViewingAngle));     
    setMatrixUniforms();
    
    if (document.getElementById("polygon").checked){
        uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,0.5,0.0],[0.0,0.0,0.0]);
        drawTerrain();
    }
    if(document.getElementById("wirepoly").checked){
        uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,0.5,0.0],[0.0,0.0,0.0]);
        drawTerrain();
        uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
        drawTerrainEdges();
    }
    if(document.getElementById("wireframe").checked){
        uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
        drawTerrainEdges();
    }
    if(document.getElementById("pointlight").checked){
        /*Cool retro 80s tron like shader
        var lightPosition = vec3.fromValues (0.0, 10.0, 0.0);
        var lightAmbient = vec3.fromValues (1.0, 0.0, 0.0 );
        var lightDiffuse = vec3.fromValues ( 1.0, 0.0, 1.0 );
        var lightSpecular = vec3.fromValues ( 1.0, 2.0, 3.0 );
        uploadLightsToShader(lightPosition,lightAmbient,lightDiffuse,lightSpecular);
        drawTerrainEdges();
        */
        
        var lightPosition = vec3.fromValues (0.0, 1.0, 1.5);
        var lightAmbient = vec3.fromValues (0.3, 0.3, 0.3);
        var lightDiffuse = vec3.fromValues ( 0.5, 0.5, 0.75 );
        var lightSpecular = vec3.fromValues ( 0.2, 0.2, 0.2 );
        //location,ambient,diffuse,specular
        uploadLightsToShader(lightPosition,lightAmbient,lightDiffuse,lightSpecular);
        drawTerrain();
        uploadLightsToShader(lightPosition,lightAmbient,lightDiffuse,lightSpecular);
        drawTerrainEdges();
    }
    
    mvPopMatrix();
}

//----------------------------------------------------------------------------------
function animate() {
   
}


//quaternion from axis-angle
function normalizedQuatFromAngles(rollAngle,pitchAngle, yawAngle){
	var q = quat.fromValues(0,0,0,1);
	quat.rotateZ(q,q,rollAngle);
	quat.rotateX(q,q,pitchAngle);
	quat.rotateY(q,q,-yawAngle);
	quat.normalize(q,q);
	return q;
}


//----------------------------------------------------------------------------------
function moveCameraPoint(newPt){
    eyePt = vec3.add(eyePt,eyePt, newPt);
}

//----------------------------------------------------------------------------------
//actually, the camera poisiton should always move forward to (eyePt + movementInterval*viewDir)
//where movementInterval is set by speed of the plane and maybe a throttle
//then, the a (left) key should map to roll left with a bit of pitch back 
//then, the d (right) key should map to roll right with a bit of pitch back
function addControls(){
    var movementInterval = 0.1;
    document.body.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;
        var value = String.fromCharCode(e.keyCode);
        switch(value) {
            case "w":
                moveCameraPoint([0.0, 0.0, -movementInterval]);
                break;
            case "a":
                moveCameraPoint([-movementInterval, 0.0, 0.0]);
                break;
            case "s":
                moveCameraPoint([0.0, 0.0, movementInterval]);
                break;
            case "d":
                moveCameraPoint([movementInterval, 0.0, 0.0]);
                break;
            case "e":
                moveCameraPoint([0.0, movementInterval, 0.0]);
                break;
            case "q":
                moveCameraPoint([0.0, -movementInterval, 0.0]);
                break;
            default:
                break;
        }
        
    });
}

//Simply moves the plane forward along its view direction vector by a distance proportional to its speed
function updatePlane(){
	var movementInterval = minSpeed + throttle*(maxSpeed-minSpeed);
	vec3.normalize(displacementVector, viewDir);
	vec3.scale(displacementVector, displacementVector, movementInterval);
	vec3.add(eyePt, eyePt, displacementVector);
}



function updateCameraOrientation(){
	var roll =  document.getElementById('roll').value; 
	 document.getElementById('rollValueDisplay').value = roll;
	
    var pitch =  document.getElementById('pitch').value;
    document.getElementById('pitchValueDisplay').value = pitch;
    
    var yaw =  document.getElementById('yaw').value;
    document.getElementById('yawValueDisplay').value = yaw;
    
    
    var q = normalizedQuatFromAngles(roll, pitch , yaw);
    

    if(pitch != 0 || ( roll != 0 && yaw != 0 ) ){ 
    	//update viewDir and up vector
    	vec3.transformQuat(viewDir, viewDirStart,q);
    	vec3.transformQuat(up, upStart, q);
    	vec3.normalize(up, up);
    	vec3.normalize(viewDir, viewDir);
    }
    else if(roll != 0){
    	//just update the up vector
    	vec3.transformQuat(up, upStart,q);
    	vec3.normalize(up, up);
    }
    else if( yaw != 0){ 
    	//just update the viewDir vector
    	vec3.transformQuat(viewDir, viewDirStart,q);
    	vec3.normalize(viewDir, viewDir);
    }
}


//----------------------------------------------------------------------------------
function startup() {    

	var havePointerLock = 'pointerLockElement' in document ||
	    'mozPointerLockElement' in document ||
	    'webkitPointerLockElement' in document;
	if(!havePointerLock){
		alert("The browser you are using does not support PointerLock, a necessary API for mouse control used on this page. Please try using Chrome.");
		return;
	}
	
	
	gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    updateCameraOrientation();
    
    //Setup the controls/inputs so the user can move the camera
    addControls();
    
    
    
    tick();
}

//----------------------------------------------------------------------------------
function tick() {
	updatePlane();
    requestAnimFrame(tick);
    draw();
    animate();
}

