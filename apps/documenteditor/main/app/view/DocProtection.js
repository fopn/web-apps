/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/**
 *  DocProtection.js
 *
 *  Created on 21.09.2022
 *
 */
define([
    'common/main/lib/util/utils',
    'common/main/lib/component/BaseView',
    'common/main/lib/component/Layout',
    'common/main/lib/component/Window',
    'common/main/lib/view/OpenDialog'
], function (template) {
    'use strict';

    DE.Views.DocProtection = Common.UI.BaseView.extend(_.extend((function(){

        // ── Styles ───────────────────────────────────────────────────────────
        var DOT_OFF  = 'display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid #888888;box-sizing:border-box;flex-shrink:0;margin-top:1px;';
        var DOT_ON   = 'display:inline-block;width:9px;height:9px;border-radius:50%;background:#2B6CCC;border:2px solid #2B6CCC;box-sizing:border-box;flex-shrink:0;margin-top:1px;'; // blue — document
        var ROW_CSS  = 'display:flex;align-items:flex-start;gap:7px;cursor:pointer;padding:3px 2px;border-radius:3px;';
        var TEXT_CSS = 'font-size:11px;line-height:1.3;white-space:nowrap;user-select:none;';

        var template =
            '<div class="group">' +
            '<span id="slot-btn-protect-doc" class="btn-slot text x-huge"></span>' +
            '</div>' +
            // Owner-only restriction controls — compact dot-list, hidden until rendered
            '<div id="fo-owner-sep" class="separator long" style="display:none;"></div>' +
            '<div id="fo-owner-group" class="group" style="display:none;flex-direction:column;justify-content:center;padding:0 10px;gap:2px;min-width:148px;">' +
            '<div class="fo-perm-row" data-perm="edit"     style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TEXT_CSS + '">Restrict Editing</span></div>' +
            '<div class="fo-perm-row" data-perm="print"    style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TEXT_CSS + '">Restrict Printing</span></div>' +
            '<div class="fo-perm-row" data-perm="download" style="' + ROW_CSS + '"><span class="fo-perm-dot" style="' + DOT_OFF + '"></span><span style="' + TEXT_CSS + '">Restrict Save Copy</span></div>' +
            '</div>';

        return {

            options: {},

            initialize: function (options) {
                Common.UI.BaseView.prototype.initialize.call(this, options);

                this.appConfig = options.mode;

                var _set = Common.enumLock;
                this.lockedControls = [];
                this._state = {disabled: false, currentProtectHint: this.hintProtectDoc };

                // ── Standard "Protect Document" button (non-owners only) ─────
                var foPerms = this.appConfig.customization && this.appConfig.customization.foOwnerPerms;

                if (!this.appConfig.isPDFForm && !(foPerms && foPerms.isOwner)) {
                    this.btnProtectDoc = new Common.UI.Button({
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-restrict-editing',
                        enableToggle: true,
                        caption: this.txtProtectDoc,
                        lock        : [_set.lostConnect, _set.coAuth, _set.previewReviewMode, _set.viewFormMode, _set.protectLock, _set.viewMode],
                        dataHint    : '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.lockedControls.push(this.btnProtectDoc);
                }

                // ── Owner restriction state (dot UI — no Button objects) ─────
                if (foPerms && foPerms.isOwner) {
                    this._foPerms        = foPerms;
                    // dot ON = restriction is ACTIVE (inverted from allowXxx)
                    this._restrictEdit     = (foPerms.allowEdit     === false);
                    this._restrictPrint    = (foPerms.allowPrint    === false);
                    this._restrictDownload = (foPerms.allowDownload === false);
                }

                Common.UI.LayoutManager.addControls(this.lockedControls);
                Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            },

            render: function (el) {
                return this;
            },

            onAppReady: function (config) {
                var me = this;
                (new Promise(function (accept, reject) {
                    accept();
                })).then(function(){
                    me.btnProtectDoc && me.btnProtectDoc.updateHint(me._state.currentProtectHint, true);
                    // wire standard protect button
                    me.btnProtectDoc && me.btnProtectDoc.on('click', function (btn, e) {
                        me.fireEvent('protect:document', [btn.pressed]);
                    });
                });
            },

            getPanel: function () {
                this.$el = $(_.template(template)( {} ));
                var me   = this;

                if (this._foPerms) {
                    // #fo-owner-group is a ROOT of $el — must use .filter(), not .find()
                    var $group = this.$el.filter('#fo-owner-group');
                    this.$el.filter('#fo-owner-sep').show();
                    $group.show();

                    // Apply initial dot states
                    this._updateDots($group);

                    // Click handler — toggle restriction and persist
                    $group.find('.fo-perm-row').on('click', function () {
                        var perm = $(this).data('perm');
                        if      (perm === 'edit')     me._restrictEdit     = !me._restrictEdit;
                        else if (perm === 'print')    me._restrictPrint    = !me._restrictPrint;
                        else if (perm === 'download') me._restrictDownload = !me._restrictDownload;
                        me._updateDots($group);
                        me._notifyParent();
                    });
                } else {
                    this.btnProtectDoc && this.btnProtectDoc.render(this.$el.find('#slot-btn-protect-doc'));
                }

                return this.$el;
            },

            // Update dot fill/outline based on current restriction state
            _updateDots: function ($group) {
                var DOT_OFF_S = 'display:inline-block;width:9px;height:9px;border-radius:50%;border:2px solid #888888;box-sizing:border-box;flex-shrink:0;margin-top:1px;';
                var DOT_ON_S  = 'display:inline-block;width:9px;height:9px;border-radius:50%;background:#2B6CCC;border:2px solid #2B6CCC;box-sizing:border-box;flex-shrink:0;margin-top:1px;'; // blue — document
                $group.find('[data-perm="edit"]     .fo-perm-dot').attr('style', this._restrictEdit     ? DOT_ON_S : DOT_OFF_S);
                $group.find('[data-perm="print"]    .fo-perm-dot').attr('style', this._restrictPrint    ? DOT_ON_S : DOT_OFF_S);
                $group.find('[data-perm="download"] .fo-perm-dot').attr('style', this._restrictDownload ? DOT_ON_S : DOT_OFF_S);
            },

            // Post updated permissions to parent Nextcloud page
            _notifyParent: function () {
                var msg = {
                    type         : 'fo:savePerms',
                    allowEdit    : !this._restrictEdit,
                    allowPrint   : !this._restrictPrint,
                    allowDownload: !this._restrictDownload
                };
                try { window.parent.postMessage(msg, '*'); } catch(e) {}
            },

            getButtons: function(type) {
                if (type === undefined)
                    return this.lockedControls;
                return [];
            },

            show: function () {
                Common.UI.BaseView.prototype.show.call(this);
                this.fireEvent('show', this);
            },

            updateProtectionTips: function(type) {
                var str = this.txtProtectDoc;
                if (type === Asc.c_oAscEDocProtect.ReadOnly) {
                    str = this.txtDocProtectedView;
                } else if (type === Asc.c_oAscEDocProtect.Comments) {
                    str = this.txtDocProtectedComment;
                } else if (type === Asc.c_oAscEDocProtect.Forms) {
                    str = this.txtDocProtectedForms;
                } else if (type === Asc.c_oAscEDocProtect.TrackedChanges){
                    str = this.txtDocProtectedTrack;
                }
                this.btnProtectDoc && this.btnProtectDoc.updateHint(str, true);
                this._state.currentProtectHint = str;
            },

            txtProtectDoc         : 'Protect Document',
            txtDocProtectedView   : 'Document is protected.<br>You may only view this document.',
            txtDocProtectedTrack  : 'Document is protected.<br>You may edit this document, but all changes will be tracked.',
            txtDocProtectedComment: 'Document is protected.<br>You may only insert comments to this document.',
            txtDocProtectedForms  : 'Document is protected.<br>You may only fill in forms in this document.',
            hintProtectDoc        : 'Protect document',
            txtDocUnlockDescription: 'Enter a password to unprotect document',
            txtUnlockTitle        : 'Unprotect Document'
        }
    }()), DE.Views.DocProtection || {}));
});
