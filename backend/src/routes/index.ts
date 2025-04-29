import { Router } from 'express';
import Paths from '@src/common/constants/Paths';
import NumberRoutes from './NumberRoutes';

const apiRouter: Router = Router();

apiRouter.get(Paths.Numbers.Get, NumberRoutes.getCertainNumbers);
apiRouter.post(Paths.Numbers.Replace, NumberRoutes.replaceNumbers);
apiRouter.patch(Paths.Numbers.Toggle, NumberRoutes.toggleChecked);

export default apiRouter;
