/*
 *  DocProtection.js (presentationeditor controller)
 *
 *  Minimal controller for the FileOpen owner access-restriction controls.
 *  The presentation editor has no native document protection, so this only
 *  creates the owner-buttons view and exposes it to the Toolbar. All
 *  persistence happens via postMessage -> parent page -> Nextcloud API.
 */
define([
    'core',
    'presentationeditor/main/app/view/DocProtection'
], function () {
    'use strict';

    PE.Controllers.DocProtection = Backbone.Controller.extend(_.extend({
        models : [],
        collections : [],
        views : [
            'DocProtection'
        ],

        initialize: function () {
        },

        onLaunch: function () {
            this._state = {};
        },

        setConfig: function (data, api) {
            this.setApi(api);
            return this;
        },

        setApi: function (api) {
            if (api) this.api = api;
            return this;
        },

        setMode: function(mode) {
            this.appConfig = mode;

            // Only create the owner controls for the file owner in edit mode.
            var foPerms = mode.customization && mode.customization.foOwnerPerms;
            if (this.appConfig.isEdit && this.appConfig.canProtect && foPerms && foPerms.isOwner) {
                this.view = this.createView('DocProtection', { mode: mode });
            }

            return this;
        },

        createToolbarPanel: function() {
            if (this.view)
                return this.view.getPanel();
        },

        // Common controllers (Comments, Plugins, Protection, ReviewChanges) call
        // getController('DocProtection').getDocProps(). The presentation editor has
        // no native document protection, so report "not protected" (null) — this
        // matches the prior behavior when this controller did not exist.
        getDocProps: function() {
            return null;
        },

        getView: function(name) {
            return !name && this.view ?
                this.view : Backbone.Controller.prototype.getView.call(this, name);
        }

    }, PE.Controllers.DocProtection || {}));
});
