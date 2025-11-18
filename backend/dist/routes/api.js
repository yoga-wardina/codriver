"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRoutes = void 0;
console.log('api.ts file loaded');
const express = require('express');
console.error('api.ts file loaded');
const createApiRoutes = (agenticService, indexingService, contextService, toolingService) => {
    console.error('createApiRoutes function STARTED');
    console.error('About to create router');
    const router = express.Router();
    console.error('Router created successfully');
    return router;
};
exports.createApiRoutes = createApiRoutes;
//# sourceMappingURL=api.js.map