import type {Point} from './api';

export type MapTurn=0|1|2|3;
export type ViewFrame={width:number;height:number;x?:number;y?:number};
type OrientationMatrix=[number,number,number,number,number,number];

/** Display-only clockwise quarter turns; stored geometry remains canonical. */
export function displayFrame(frame:ViewFrame,turn:MapTurn=0):{width:number;height:number}{
 return turn===1||turn===3?{width:frame.height,height:frame.width}:{width:frame.width,height:frame.height};
}
export function toDisplayPoint([sourceX,sourceY]:Point,{width,height,x=0,y=0}:ViewFrame,turn:MapTurn=0):Point{
 const localX=sourceX-x,localY=sourceY-y;
 if(turn===1)return [height-localY,localX];
 if(turn===2)return [width-localX,height-localY];
 if(turn===3)return [localY,width-localX];
 return [localX,localY];
}
export function fromDisplayPoint([displayX,displayY]:Point,{width,height,x=0,y=0}:ViewFrame,turn:MapTurn=0):Point{
 if(turn===1)return [displayY+x,height-displayX+y];
 if(turn===2)return [width-displayX+x,height-displayY+y];
 if(turn===3)return [width-displayY+x,displayX+y];
 return [displayX+x,displayY+y];
}
export function orientationMatrix({width,height,x=0,y=0}:ViewFrame,turn:MapTurn=0):OrientationMatrix{
 const negativeX=-x||0,negativeY=-y||0;
 if(turn===1)return [0,1,-1,0,height+y,negativeX];
 if(turn===2)return [-1,0,0,-1,width+x,height+y];
 if(turn===3)return [0,-1,1,0,negativeY,width+x];
 return [1,0,0,1,negativeX,negativeY];
}
export function orientationTransform(frame:ViewFrame,turn:MapTurn=0):string{
 return 'matrix('+orientationMatrix(frame,turn).join(' ')+')';
}
