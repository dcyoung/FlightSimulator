//-------------------------------------------------------------------------
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    //the grid (n rows)x(n cols), but it is (n+1)x(n+1) vetices
    
    for(var x=0; x<=n; x++){
        for(var y=0; y<=n; y++){
            vertexArray.push(minX+deltaX*y);
            vertexArray.push(minY+deltaY*x);
            vertexArray.push(0);
           
            normalArray.push(0);
            normalArray.push(0);
            normalArray.push(1);
        }
    }
    
    
    //Generate a heightmap for a piece of terrain using the diamond square algorithm
    var heightScale = 0.025;
    var heightMap = new DiamondSquareTerrainGenerator(n+1);
    heightMap.generate();
    
    //Set the height of each vertex in the vertex array, by reading off corresponding height from generated heightmap
    for(var x=0; x<=n; x++){
        for(var y=0; y<=n; y++){
            height = heightMap.getVertexHeight(x,y);
            scaledHeight = height*heightScale;
            vertexArray[(x*(n+1)+y)*3+2] = scaledHeight; 
        }
    }
    
    
    var numT=0;
    for(var row=0; row<n; row++){
        for(var col=0; col<n; col++){
           var vid = row*(n+1) + col;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       } 
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


