/*
 *  DocProtection.js (presentationeditor)
 *
 *  FileOpen owner access-restriction controls — compact dot-list UI.
 *  Dot ON (red) = restriction is active for shared users.
 *  Dot OFF (grey outline) = no restriction (default).
 */
define([
    'common/main/lib/util/utils',
    'common/main/lib/component/BaseView',
    'common/main/lib/component/Layout'
], function () {
    'use strict';

    var DOT_OFF = 'display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid #888888;box-sizing:border-box;flex-shrink:0;margin-top:1px;';
    var DOT_ON  = 'display:inline-block;width:9px;height:9px;border-radius:50%;background:#D84315;border:2px solid #D84315;box-sizing:border-box;flex-shrink:0;margin-top:1px;'; // orange — presentation
    var ROW_CSS = 'display:flex;align-items:flex-start;gap:7px;cursor:pointer;padding:3px 2px;border-radius:3px;';
    var TXT_CSS = 'font-size:11px;line-height:1.3;white-space:nowrap;user-select:none;';

    PE.Views.DocProtection = Common.UI.BaseView.extend(_.extend((function(){
        var template =
            '<div id="fo-owner-group" class="group" style="flex-direction:column;justify-content:center;padding:0 10px;gap:2px;min-width:148px;">' +
            '<div class="fo-perm-row" data-perm="edit"     style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TXT_CSS + '">Restrict Editing</span></div>' +
            '<div class="fo-perm-row" data-perm="print"    style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TXT_CSS + '">Restrict Printing</span></div>' +
            '<div class="fo-perm-row" data-perm="download" style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TXT_CSS + '">Restrict Save Copy</span></div>' +
            '</div>';

        return {

            options: {},

            initialize: function (options) {
                Common.UI.BaseView.prototype.initialize.call(this, options);

                this.appConfig   = options.mode || {};
                this.lockedControls = [];
                this._state      = {disabled: false};

                var foPerms = this.appConfig.customization && this.appConfig.customization.foOwnerPerms;
                if (foPerms && foPerms.isOwner) {
                    this._foPerms        = foPerms;
                    this._restrictEdit     = (foPerms.allowEdit     === false);
                    this._restrictPrint    = (foPerms.allowPrint    === false);
                    this._restrictDownload = (foPerms.allowDownload === false);
                }

                Common.UI.LayoutManager.addControls(this.lockedControls);
                Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            },

            render: function (el) { return this; },

            onAppReady: function (config) { /* nothing needed */ },

            getPanel: function () {
                this.$el = $(_.template(template)({}));
                var me   = this;

                if (this._foPerms) {
                    // #fo-owner-group is the root element — use .filter()
                    var $group = this.$el.filter('#fo-owner-group');
                    this._updateDots($group);

                    $group.find('.fo-perm-row').on('click', function () {
                        var perm = $(this).data('perm');
                        if      (perm === 'edit')     me._restrictEdit     = !me._restrictEdit;
                        else if (perm === 'print')    me._restrictPrint    = !me._restrictPrint;
                        else if (perm === 'download') me._restrictDownload = !me._restrictDownload;
                        me._updateDots($group);
                        me._notifyParent();
                    });
                }

                return this.$el;
            },

            _updateDots: function ($group) {
                var OFF = 'display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid #888888;box-sizing:border-box;flex-shrink:0;margin-top:1px;';
                var ON  = 'display:inline-block;width:9px;height:9px;border-radius:50%;background:#D84315;border:2px solid #D84315;box-sizing:border-box;flex-shrink:0;margin-top:1px;'; // orange — presentation
                $group.find('[data-perm="edit"]     .fo-perm-dot').attr('style', this._restrictEdit     ? ON : OFF);
                $group.find('[data-perm="print"]    .fo-perm-dot').attr('style', this._restrictPrint    ? ON : OFF);
                $group.find('[data-perm="download"] .fo-perm-dot').attr('style', this._restrictDownload ? ON : OFF);
            },

            _notifyParent: function () {
                var msg = {
                    type         : 'fo:savePerms',
                    allowEdit    : !this._restrictEdit,
                    allowPrint   : !this._restrictPrint,
                    allowDownload: !this._restrictDownload
                };
                try { window.parent.postMessage(msg, '*'); } catch(e) {}
            },

            getButtons: function (type) {
                if (type === undefined) return this.lockedControls;
                return [];
            },

            show: function () {
                Common.UI.BaseView.prototype.show.call(this);
                this.fireEvent('show', this);
            }
        }
    }()), PE.Views.DocProtection || {}));
});
