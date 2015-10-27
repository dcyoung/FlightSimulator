//--------------Helper functions added to the array prototype------------------
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}
Array.prototype.pushVec3 = function(vertex) {
    this.push(vertex[0]);
    this.push(vertex[1]);
    this.push(vertex[2]);
}
Array.prototype.getVec3 = function(id) {
    var vertex = vec3.fromValues(this[id*3],this[id*3+1],this[id*3+2]);
	return vertex;
}
Array.prototype.replaceVec3 = function(id, vector) {
    this[id*3] = vector[0];
    this[id*3+1] = vector[1];
    this[id*3+2] = vector[2];
}
//-------------------------------------------------------------------------



//-------------------------------------------------------------------------
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    
    //Generate a heightmap for a piece of terrain using the diamond square algorithm
    var heightScale = 0.025;
    var heightMap = new DiamondSquareTerrainGenerator(n+1);
    heightMap.generate();
    
    //the grid (n rows)x(n cols), but it is (n+1)x(n+1) vetices
    for(var x=0; x<=n; x++){
        for(var y=0; y<=n; y++){
        	//Determine the height of each vertex in the vertex array, by reading off corresponding height from generated heightmap
        	height = heightMap.getVertexHeight(x,y);
        	scaledHeight = height*heightScale;
        	
        	//create this terrain vertex and push its values to the vertexArray
            var vertex = vec3.fromValues(minX+deltaX*y, minY+deltaY*x, scaledHeight);
            vertexArray.pushVec3(vertex);
            
            //push an empty normal vector as well, which will be overwritten shortly
            normalArray.pushVec3(vec3.fromValues(0,0,0));
        }
    }
    
    
    var numT=0; //number of triangles pushed to the face array

    //push 2 triangles for every space in the grid using the 4 vertices surrounding that grid space
    for(var row=0; row<n; row++){
        for(var col=0; col<n; col++){
        	var vid0 = row*(n+1) + col;
        	var vid1 = vid0 + 1;
        	var vid2 = vid0 + (n+1);
        	var vid3 = vid2 +1;
           
        	var triangle0 = vec3.fromValues(vid0,vid1,vid2);
        	var triangle1 = vec3.fromValues(vid1,vid3,vid2);
        	faceArray.pushVec3(triangle0);
        	faceArray.pushVec3(triangle1);
           
        	numT+=2;
       } 
    }
    
    //efficiently compute per-vertex normals averages from the face normals incident upon the vertex
    //assumes mesh is in an indexed representation
    //for each face in the faceArray
    for(var faceCount = 0; faceCount < numT; faceCount++){
    	//next triangle (face) is made up of the following 3 vertices    	
    	var f = faceArray.getVec3(faceCount);

    	//since face is a triangle, the normal can be computed by cross product of vectors 
    	//corresponding to two of the 3 sides of the triangle. 
    	//First create two vectors along the face (2 sides of the triangle)
    	var tempTriangleVert0 = vertexArray.getVec3(f[0]);
    	var tempTriangleVert1 = vertexArray.getVec3(f[1]);
    	var tempTriangleVert2 = vertexArray.getVec3(f[2]);
    	
    	var tempTriangleSideVec0 = vec3.create();
    	var tempTriangleSideVec1 = vec3.create();
    	vec3.subtract(tempTriangleSideVec0, tempTriangleVert1, tempTriangleVert0);
    	vec3.subtract(tempTriangleSideVec1, tempTriangleVert2, tempTriangleVert0);
    	
    	//use them to compute the cross product for the normal
    	var normalVec = vec3.create();
    	vec3.cross(normalVec, tempTriangleSideVec0, tempTriangleSideVec1);
    	
    	//sum up the additions of those normal vectors for that vertex
    	for(var i = 0; i < 3; i++){
    		var currentNormal = normalArray.getVec3(f[i]);
    		var incrementedNormal = vec3.create();
    		vec3.add(incrementedNormal, currentNormal, normalVec);
    		normalArray.replaceVec3(f[i], incrementedNormal);
    	}
    }
    
    //make sure the normal vectors are all unit length
    for(var n = 0; n < normalArray.length/3; n++){
    	var normalized = vec3.create();
    	vec3.normalize(normalized, normalArray.getVec3(n));
    		normalArray.replaceVec3(n, normalized);
    }

    return numT;
}




//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//-------------------------------------------------------------------------


