"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arr = void 0;
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_1 = __importDefault(require("express"));
const jet_logger_1 = __importDefault(require("jet-logger"));
const routes_1 = __importDefault(require("@src/routes"));
const Paths_1 = __importDefault(require("@src/common/constants/Paths"));
const ENV_1 = __importDefault(require("@src/common/constants/ENV"));
const HttpStatusCodes_1 = __importDefault(require("@src/common/constants/HttpStatusCodes"));
const route_errors_1 = require("@src/common/util/route-errors");
const constants_1 = require("@src/common/constants");
/******************************************************************************
                                Setup
******************************************************************************/
const app = (0, express_1.default)();
exports.arr = Array.from({ length: 1000000 }, (_, i) => ({ value: i, checked: false }));
// Basic middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Show routes called in console during development
if (ENV_1.default.NodeEnv === constants_1.NodeEnvs.Dev) {
    app.use((0, morgan_1.default)('dev'));
}
// Security
if (ENV_1.default.NodeEnv === constants_1.NodeEnvs.Production) {
    // eslint-disable-next-line n/no-process-env
    if (!process.env.DISABLE_HELMET) {
        app.use((0, helmet_1.default)());
    }
}
// Add APIs, must be after middleware
app.use(Paths_1.default.Base, routes_1.default);
// Add error handler
app.use((err, _, res, next) => {
    if (ENV_1.default.NodeEnv !== constants_1.NodeEnvs.Test.valueOf()) {
        jet_logger_1.default.err(err, true);
    }
    let status = HttpStatusCodes_1.default.BAD_REQUEST;
    if (err instanceof route_errors_1.RouteError) {
        status = err.status;
        res.status(status).json({ error: err.message });
    }
    return next(err);
});
// **** FrontEnd Content **** //
// Set views directory (html)
const viewsDir = path_1.default.join(__dirname, 'views');
app.set('views', viewsDir);
// Set static directory (js and css).
const staticDir = path_1.default.join(__dirname, 'public');
app.use(express_1.default.static(staticDir));
// Nav to users pg by default
app.get('/', (_, res) => {
    return res.redirect('/users');
});
// Redirect to login if not logged in.
app.get('/users', (_, res) => {
    return res.sendFile('users.html', { root: viewsDir });
});
/******************************************************************************
                                Export default
******************************************************************************/
exports.default = app;
