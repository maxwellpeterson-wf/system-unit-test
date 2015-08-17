'use strict';
import {Module, IAppScopeService} from './app';

function RouterConfig($locationProvider: ng.ILocationProvider,
                      $httpProvider: ng.IHttpProvider,
                      $urlRouterProvider: ng.ui.IUrlRouterProvider) {
    $locationProvider.html5Mode({
        enabled: false,
        requireBase: false
    });
    $httpProvider.useApplyAsync(true);
    return $urlRouterProvider.otherwise('/login');
}

function Config($logProvider: ng.ILogProvider,
                fitTextConfigProvider: any,
                $numbroConfigProvider: any,
                $mdIconProvider: ng.material.IIconProvider,
                $mdThemingProvider: ng.material.IThemingProvider) {
    // enable log
    $logProvider.debugEnabled(true);

    // set options third-party lib
    fitTextConfigProvider.config = {
        min: '16px',
        max: '22px'
    };

    $numbroConfigProvider.setFormat('float', '0.00');
    $numbroConfigProvider.setFormat('no-sign', '0,0[.]00');
    $numbroConfigProvider.setFormat('no-cents', '0,0');
    $numbroConfigProvider.setDefaultFormat('$0,0.00');
    $numbroConfigProvider.setDefaultCurrencyFormat('0,0.00');

}

Module.config([
    '$logProvider',
    'fitTextConfigProvider',
    '$numbroConfigProvider',
    '$mdIconProvider',
    '$mdThemingProvider',
    Config
]).config([
    '$locationProvider',
    '$httpProvider',
    '$urlRouterProvider',
    RouterConfig
]);