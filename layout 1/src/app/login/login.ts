'use strict';
import {Module} from '../app';


class LoginController {
    public static id: string = 'login';
    public static $inject = [
        '$state',
        '$mdToast'
    ];

    public location: string;
    public pin: string;

    constructor(
        private $state: ng.ui.IStateService,
        private $mdToast: ng.material.IToastService) {
        this.location = 'Scottsdale';
    }


    public numPadKeyPress(key: string): void {
        // this.playKeyStandard();
        if (this.pin !== undefined) {
            this.pin += key;
        } else {
            this.pin = key;
        }
    }

    public backspace(): void {
        // this.playKeyDelete();
        if (this.pin !== undefined) {
            if (this.pin.length > 0) {
                this.pin = this.pin.slice(0, -1);
                //  this.playKeyDelete();
            } else {
                //   this.playKeyInvalid();
            }
        } else {
            // this.playKeyDelete();
            //// should be safe to remove if ng-minlength is removed or the problem with it solved.
            //$('#inputPin')
            //    .val(function(index, value) {
            //        return value.substr(0, value.length - 1);
            //    });
        }
    }


    public showLoginToast(): void {
        this.$mdToast.show(this.$mdToast.simple()
                .content('You have been logged in!')
                .position('top right'));
    }
}

Module.controller(LoginController).state('login');
