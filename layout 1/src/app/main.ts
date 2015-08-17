'use strict';
import './app';
import './material';
import './app-config';
import './login/all';

//import router from 'oclazyload-systemjs-router';
//import futureRoutes from 'routes.json!';
//getModule().config(router(getModule(), futureRoutes));
angular.element(document).ready(() => {
    angular.bootstrap(document.body, ['app'], {
        strictDi: true
    });
});