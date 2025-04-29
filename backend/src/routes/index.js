"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Paths_1 = __importDefault(require("@src/common/constants/Paths"));
const NumberRoutes_1 = __importDefault(require("./NumberRoutes"));
const apiRouter = (0, express_1.Router)();
apiRouter.get(Paths_1.default.Numbers.Get, NumberRoutes_1.default.getCertainNumbers);
apiRouter.post(Paths_1.default.Numbers.Replace, NumberRoutes_1.default.replaceNumbers);
apiRouter.patch(Paths_1.default.Numbers.Toggle, NumberRoutes_1.default.toggleChecked);
exports.default = apiRouter;
