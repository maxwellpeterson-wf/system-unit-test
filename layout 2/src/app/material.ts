'use strict';
import {Module} from './app';
import 'angular-material/angular-material.css!';
import './app.css!';
Module.config(['$mdIconProvider', '$mdThemingProvider', configMaterial]);

function configMaterial($mdIconProvider: any, $mdThemingProvider: any) {
}