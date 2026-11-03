import type {Point} from './api';

export type MapTurn=0|1|2|3;
type Frame={width:number;height:number};

/** Display-only clockwise quarter turns; stored geometry remains canonical. */
export function displayFrame(frame:Frame,turn:MapTurn=0):Frame{
 return turn===1||turn===3?{width:frame.height,height:frame.width}:{width:frame.width,height:frame.height};
}
export function toDisplayPoint([x,y]:Point,{width,height}:Frame,turn:MapTurn=0):Point{
 if(turn===1)return [height-y,x];
 if(turn===2)return [width-x,height-y];
 if(turn===3)return [y,width-x];
 return [x,y];
}
export function fromDisplayPoint([x,y]:Point,{width,height}:Frame,turn:MapTurn=0):Point{
 if(turn===1)return [y,height-x];
 if(turn===2)return [width-x,height-y];
 if(turn===3)return [width-y,x];
 return [x,y];
}
export function orientationTransform({width,height}:Frame,turn:MapTurn=0):string{
 if(turn===1)return 'matrix(0 1 -1 0 '+height+' 0)';
 if(turn===2)return 'matrix(-1 0 0 -1 '+width+' '+height+')';
 if(turn===3)return 'matrix(0 -1 1 0 0 '+width+')';
 return 'matrix(1 0 0 1 0 0)';
}
