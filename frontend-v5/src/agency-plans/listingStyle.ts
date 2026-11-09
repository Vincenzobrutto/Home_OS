import type {PlanShape} from './PlanMeasurementView';
import {isBalcony} from './scaleDetection';

export function listingRoomFill(room: PlanShape) {
 if (room.kind !== 'excluded' && (isBalcony(room) || /terraz|giardin/i.test(room.label))) return '#d2e2d4';
 if (/bagno|servizi/i.test(room.label)) return '#dbe9e8';
 if (/camera/i.test(room.label)) return '#e1e5ec';
 if (/cucina/i.test(room.label)) return '#f2e1cd';
 if (/soggiorno|salone/i.test(room.label)) return '#eee0d5';
 if (/disimpegno|corridoio/i.test(room.label)) return '#eeeae0';
 return '#f0f1ee';
}
