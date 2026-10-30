import type {MeasurementConfiguration} from './measurement-types';
export type PaperReference={format:'A4'|'A3';orientation:'portrait'|'landscape';denominator:number;widthUnits:number;heightUnits:number};
/** Presentation builder; backend validates all derived values against the stored raster. */
export function paperCalibration(p:PaperReference):MeasurementConfiguration['calibration']{
 if(!['A4','A3'].includes(p.format)||!['portrait','landscape'].includes(p.orientation)||!Number.isFinite(p.denominator)||p.denominator<1||p.denominator>10000||![p.widthUnits,p.heightUnits].every(n=>Number.isSafeInteger(n)&&n>0&&n<=5000))throw new Error('Controlla formato, scala e dimensioni del documento.');
 let [w,h]=p.format==='A4'?[.210,.297]:[.297,.420];if(p.orientation==='landscape')[w,h]=[h,w];
 if(Math.abs((p.widthUnits/p.heightUnits)/(w/h)-1)>.03)throw new Error('Le proporzioni non corrispondono al foglio scelto: verifica ritagli o deformazioni, oppure usa una misura nota.');
 return {start:[0,0],end:[p.widthUnits,0],metres:w*p.denominator,confirmed:false,maxRelativeError:.03,check:{start:[0,0],end:[0,p.heightUnits],metres:h*p.denominator},paper:{...p}};
}
