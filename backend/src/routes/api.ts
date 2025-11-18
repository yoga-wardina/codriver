import { Router } from 'express';

console.log('api.ts file loaded');

const express = require('express');

console.error('api.ts file loaded');

export const createApiRoutes = (agenticService: any, indexingService: any, contextService: any, toolingService: any) => {
  console.error('createApiRoutes function STARTED');

  console.error('About to create router');
  const router = express.Router();
  console.error('Router created successfully');

  return router;
};
