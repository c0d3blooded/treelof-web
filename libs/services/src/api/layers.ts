import { Layer } from '@treelof/models';
import { apiClientPublic } from '..';

/* Get list of available layers */
export const getLayers = () => apiClientPublic.get<Array<Layer>>('/layers');
