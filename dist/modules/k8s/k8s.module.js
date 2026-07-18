var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nitrostack/core';
import { K8sTools } from './k8s.tools.js';
import { K8sResources } from './k8s.resources.js';
import { K8sPrompts } from './k8s.prompts.js';
let K8sModule = class K8sModule {
};
K8sModule = __decorate([
    Module({ name: 'k8s', controllers: [K8sTools, K8sResources, K8sPrompts], providers: [] })
], K8sModule);
export { K8sModule };
