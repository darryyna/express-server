import {Router} from 'express';
import {UserController} from '../controller/userController';
import {authorizeRoles, verifyToken} from '../middleware/authMiddleware';
import {UserRole} from "../model/User";
import {cacheMiddleware} from "../middleware/cacheMiddleware";

const router = Router();
const userController = new UserController();

router.get('/', verifyToken, userController.findUsers);

router.get('/:id', verifyToken, cacheMiddleware(2000) ,userController.getUserById);

router.post('/', verifyToken, authorizeRoles(UserRole.Admin), userController.createUser);

router.put('/:id', verifyToken, authorizeRoles(UserRole.Admin), userController.updateUser);

router.delete('/:id', verifyToken, authorizeRoles(UserRole.Admin), userController.deleteUser);


export default router;