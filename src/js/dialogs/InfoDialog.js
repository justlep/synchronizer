
'use strict';

let {ko, Helper} = require('../common'),
    DialogManager = require('../DialogManager'),
    TEMPLATES = {
        DEFAULT: 'infoDialogTpl'
    },
    instance,
    getInstance = function(templateName, optionalContextVars) {
        Helper.assertString(templateName, 'invalid tempalte name for InfoDialog.getInstance()');
        if (!instance) {
            instance = new InfoDialog();
        }
        instance.setTemplateName(templateName);
        instance.setContextVars(optionalContextVars);
        return instance;
    };

/**
 * A standard dialog for readonly content.
 * @constructor
 */
function InfoDialog() {

    let self = this,
        dialogManager = DialogManager.getInstance();

    this.settings = DialogManager.createDialogSettings({
                        templateName: '',
                        modalWidth: '530'
                    });

    /**
     * Object containing properties that might be used in the template via data-bind.
     */
    this.contextVars = null;

    this.setContextVars = function(newContextVars) {
        this.contextVars = newContextVars || null;
    };

    this.setTemplateName = function(templateName) {
        Helper.assert(templateName, 'Invalid template name for InfoDialog');
        self.settings.templateName = templateName;
    };

    this.show = function() {
        dialogManager.showDialog(this);
    };
}

module.exports = {
    getInstance,
    getDefaultInstance: function(infoText) {
        Helper.assertString(infoText, 'String excepted in InfoDialog.getDefaultInstance()');
        return getInstance(TEMPLATES.DEFAULT, {infoText: infoText || 'no info text'});
    }
};
