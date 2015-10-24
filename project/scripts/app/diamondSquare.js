/*
* DiamondSquare.js (Terrain Generator)
* This file generates a tile of terrain using the diamond square algorithm.  
* To keep it's functionality compartamentalized, it is setup using a javascript prototype.
* This means any objects created using DiamondSquareTerrainGenerator() will 
* inherit from this DiamondSquareTerrainGenerator.prototype... functionally this is like
* creating a class.
*/

/**
* Constructor: instantiates a heightmap to hold height information for the tile
* vertSideLength: # of vertices on one side of the square tile. 
*                Must be 1 greater than a power of 2 (ie: 2*n+1)
*/
function DiamondSquareTerrainGenerator(vertSideLength) {
    this.size = vertSideLength;
    this.max = this.size - 1;
    numHeightmapVertices = this.size * this.size;
    this.heightMap = new Float32Array(numHeightmapVertices);
    this.fluctionWeight = 0.4;
};


/**
* generate the heightmap using the diamong square algorithm as follows...
*   -initialize 4 corners to some height
*   -until all array values are set
*       -for each square in the array, midpoint height = avg four corner pts + random value
*       -for each diamond in the array, midpoint height = avg four corner pts + random value
*       -reduce magnitude of the random value
*       -divide each square into 4 sub-squares and iterate
*/
DiamondSquareTerrainGenerator.prototype.generate = function() {
    //initialize the 4 corners of the whole tile to a set height
    var cornerHeight = 20;
    this.setVertexHeight(0, 0, cornerHeight);
    this.setVertexHeight(this.size-1, 0, cornerHeight);
    this.setVertexHeight(this.size-1, this.size-1, cornerHeight);
    this.setVertexHeight(0, this.size-1, cornerHeight);
    
    //kick off the diamond square algorithm
    this.divideTile(this.max);
};

/**
* Divides a tile into 4 sub-tiles and calls the square and diamond 
* methods on the subtiles. Will continue until all array values have been set.
*/
DiamondSquareTerrainGenerator.prototype.divideTile = function(localSize) {
    var x,y;
    var halfSize = localSize/2;
    var randomOffsetScale = this.fluctionWeight * localSize;
    var randomHeightOffset;
    //only recurse/subdivide if the square is big enough to subdivide
    if(halfSize >= 1){
        for (y = halfSize; y < this.max; y += localSize) {
            for (x = halfSize; x < this.max; x += localSize) {
                randomHeightOffset = Math.random() * randomOffsetScale * 2 - randomOffsetScale;
                this.squareStep(x, y, halfSize, randomHeightOffset);
            }
        }
        for (y = 0; y <= this.max; y += halfSize) {
            for (x = (y + halfSize) % localSize; x <= this.max; x += localSize) {
                randomHeightOffset = Math.random() * randomOffsetScale * 2 - randomOffsetScale;
                this.diamondStep(x, y, halfSize, randomHeightOffset);
            }
        }
        //divide and iterate again
        this.divideTile(localSize / 2);
    }
    else{
        //end the recursion if the square is too small to subdivide
        return;  
    }
};

/**
* For a square in the array, midpoint height = avg four corner points + random value 
*/
DiamondSquareTerrainGenerator.prototype.squareStep = function(x, y, localSize, randomHeightOffset) {
    var squareVertices = [];
    var tempHeight;
    //if the upper left corner exists
    if( (tempHeight = this.getVertexHeight(x - localSize, y - localSize)) !=-1){ 
        squareVertices.push(tempHeight);
    }
    //if the upper right corner exits
    if( (tempHeight = this.getVertexHeight(x + localSize, y - localSize)) !=-1){
        squareVertices.push(tempHeight);
    }
    //if the lower right corner exits
    if( (tempHeight = this.getVertexHeight(x + localSize, y + localSize)) !=-1){
        squareVertices.push(tempHeight);
    }
    //if the lower left corner exits
    if( (tempHeight = this.getVertexHeight(x - localSize, y + localSize)) !=-1){
        squareVertices.push(tempHeight);
    } 
    
    var midPointHeight = this.getAverageOfArray(squareVertices);
    this.setVertexHeight(x, y, midPointHeight + randomHeightOffset);
};

/**
* For a diamond in the array, midpoint height = avg four corner points + random value
*/
DiamondSquareTerrainGenerator.prototype.diamondStep = function(x, y, localSize, randomHeightOffset) {
    var diamondVertices = [];
    var tempHeight;
    //if the top exists
    if( (tempHeight = this.getVertexHeight(x, y - localSize)) !=-1){ 
        diamondVertices.push(tempHeight);
    }
    //if the right exists
    if( (tempHeight = this.getVertexHeight(x + localSize, y)) !=-1){ 
       diamondVertices.push(tempHeight);
    }
    //if the bottom exists
    if( (tempHeight = this.getVertexHeight(x, y + localSize)) !=-1){ 
        diamondVertices.push(tempHeight);
    }
    //if the left exists
    if( (tempHeight = this.getVertexHeight(x - localSize, y)) !=-1){ 
        diamondVertices.push(tempHeight);
    }
    
  var midPointHeight = this.getAverageOfArray(diamondVertices);
  this.setVertexHeight(x, y, midPointHeight + randomHeightOffset);
};

/**
* Returns the average of an array of numbers
*/
DiamondSquareTerrainGenerator.prototype.getAverageOfArray = function(arrayOfValues) {
    //use Arrays.prototype.reduce to return the average of the array... it will reduce the
    //array by moving left to right and reducing every pair of values to a single value according
    //to the function defined, in this case sum.
    var initialValue = 0;
    var total = arrayOfValues.reduce(
        function(leftValue, rightValue) { 
            reducedValue = leftValue + rightValue;
            return reducedValue; 
        }
        , initialValue);
    var avg = total/arrayOfValues.length;
    return avg;
};

/**
* Get the height at a specific vertex (x,y) from the heightmap
*  here the heightmap is stored in row major order (where x is the col and y is the row)
*/
DiamondSquareTerrainGenerator.prototype.getVertexHeight = function(x, y) {
    if (y < 0 || x < 0 || y > this.max || x > this.max ){
        return -1;
    } 
    return this.heightMap[(this.size * y) +x];
};

/**
* Set the height at a specific vertex (x,y) in the heightmap
*  here the heightmap is stored in row major order (where x is the col and y is the row)
*/
DiamondSquareTerrainGenerator.prototype.setVertexHeight = function(x, y, heightValue) {
    this.heightMap[(this.size * y) + x] = heightValue;
};
