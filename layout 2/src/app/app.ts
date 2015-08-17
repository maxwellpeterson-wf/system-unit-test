'use strict';
import 'angular';
import 'angular-ui-router';
//import {defaults} from 'ng-decorate';
import 'angular-material';
import 'angular-messages';
import 'angular-animate';
//import 'ng-click-select';
import 'ng-fittext';
import 'ng-slide-down';
import 'angular-moment';
import 'angular-numbro';
import 'robertbaker/angular-credit-cards';
import './templates.js';

export interface IAppScopeService extends ng.IRootScopeService {
    title: string;
}

var app = angular.module('app', [
    'app.templates',
    'ui.router',
    'ngMaterial',
    'ngMessages',
    'ngNumbro',
    'ngFitText',
    'ngAnimate',
    'ng-slide-down',
    'angularMoment',
    'credit-cards'
]);


interface IStateConfig {
    (stateProvider: ng.ui.IStateProvider): void;
}

interface IController {
    id: string;
    $inject?: string[];

}

interface IService {
    id: string;
    $inject?: string[];
}

interface IComponent extends Function {
    id: string;
    $inject?: string[];
}

interface IFilter extends ng.IDirective {
    id: string;
    $inject?: string[];
    factory: () => (...args: any[]) => string;
}

interface IModule {
    component<T extends ng.IDirective>(componentClass: IComponent): IModule;
    attribute<T extends ng.IDirective>(attributeClass: IComponent): IModule;
    filter(filterClass: IFilter): IModule;
    run(inlineAnnotatedFunction: any[]): IModule;
    service(serviceClass: IService): IModule;
    addSectionToSidenav(section: any): IModule;
    state(stateName: string, stateConfig?: ng.ui.IState): IModule;
    controller(controllerClass: IController, noController?: boolean): IModule;
    config(inlineAnnotatedFunction: any[]): IModule;
}

export class Directive {

    constructor() {
        if (this['linker']) {
            this['link'] = this['linker'].bind(this);
        }
        if (this['compiler']) {
            this['compile'] = this['compiler'].bind(this);
        }
    }
}
export class Module {
    private static module = angular.module('app');

    public static GetFactoryFor<T extends ng.IDirective>(classType: Function): ng.IDirectiveFactory {
        const factory = (...args: any[]): T => {
            var directive = <any>classType;
            return new directive(...args); // this requires es6.


        };
        factory.$inject = classType.$inject;
        return factory;
    }

    public static component<T extends ng.IDirective>(componentClass: IComponent,
                                                     controllerClass?: IController): IModule {
        this.injectControllerIntoComponent(componentClass, controllerClass);
        this.injectRestrictionsIntoComponent(componentClass, 'E');
        this.module.directive(componentClass.id, this.GetFactoryFor<T>(<Function>componentClass));
        return this;
    }

    public static attribute<T extends ng.IDirective>(attributeClass: IComponent,
                                                     controllerClass?: IController): IModule {
        this.injectControllerIntoComponent(attributeClass, controllerClass);
        this.injectRestrictionsIntoComponent(attributeClass, 'A');
        this.module.directive(attributeClass.id, Module.GetFactoryFor<T>(<Function>attributeClass));
        return this;
    }

    private static injectControllerIntoComponent(componentClass: IComponent, controllerClass?: IController) {
        if (controllerClass) {
            if (componentClass.prototype.controller == undefined) {
                componentClass.prototype.controller = componentClass.id + 'Controller';
            }

            if (componentClass.prototype.controllerAs == undefined) {
                componentClass.prototype.controllerAs = 'vm';
            }
            if (componentClass.prototype.bindToController == undefined) {
                componentClass.prototype.bindToController = true;
            }
            this.controller(controllerClass);
        }
    }

    private static injectRestrictionsIntoComponent(componentClass: IComponent, restrictions: string) {
        if (componentClass.prototype.restrict == undefined) {
            componentClass.prototype.restrict = restrictions;
        }
    }

    public static filter(filterClass: IFilter): IModule {
        this.module.filter(filterClass.id, filterClass.factory);
        return this;
    }

    public static run(inlineAnnotatedFunction: any[]): IModule {
        this.module.run(inlineAnnotatedFunction);
        return this;
    }

    public static addSectionToSidenav(section: any): IModule {
        this.module.run([
            'ui', (ui: any) => {
                ui.addSectionToSidenav(section);
            }
        ]);
        return this;
    }

    public static service(serviceClass: IService): IModule {
        this.module.service(serviceClass.id, <any>serviceClass);

        return this;
    }

    public static controller(controllerClass: IController): IModule {
        this.module.controller(controllerClass.id + 'Controller', <any>controllerClass);
        return this;
    }

    public static config(inlineAnnotatedFunction: any[]): IModule {
        this.module.config(inlineAnnotatedFunction);
        return this;
    }

    public static state(stateName: string, stateConfig?: ng.ui.IState): IModule {
        const injectorArray = [
            '$stateProvider', ($stateProvider: ng.ui.IStateProvider) => {


                if (stateConfig == undefined) {
                    stateConfig = {};
                }

                if (stateConfig.templateUrl == undefined) {
                    stateConfig.templateUrl = `${stateName}/${stateName}.html`;
                }

                if (stateConfig.url == undefined) {
                    stateConfig.url = `/${stateName}`;
                }

                if (stateConfig.controller == undefined) {
                    stateConfig.controller = `${stateName}Controller`;
                }

                if (stateConfig.controllerAs == undefined) {
                    stateConfig.controllerAs = 'vm';
                }

                $stateProvider.state(stateName, stateConfig);
            }
        ];
        this.module.config(injectorArray);
        return this;
    };

    public static get name(): string {
        return this.module.name;
    }
}
