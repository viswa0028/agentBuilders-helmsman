var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { K8sModule } from './modules/k8s/k8s.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    McpApp({ module: AppModule, server: { name: 'helmsman', version: '1.0.0' }, logging: { level: 'info' } }),
    Module({ name: "app", imports: [ConfigModule.forRoot(), K8sModule] })
], AppModule);
export { AppModule };
