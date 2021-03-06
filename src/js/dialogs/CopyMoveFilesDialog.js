
'use strict';

const {ko, Helper, _} = require('../common'),
    PathWatcher = require('../PathWatcher'),
    DialogManager = require('../DialogManager'),
    DEFAULT_WIDTH = 700,
    getInstance = function(opts) {
        if (!instance) {
            instance = new CopyMoveFilesDialog();
        }
        instance.init(opts);
        return instance;
    },
    nodeFs = require('fs'),
    nodeFsExtra = require('fs-extra'),
    nodePath = require('path'),
    Spectrograms = require('../Spectrograms');

let instance;

/**
 * Dialog opened after dragging selected files to a folder
 * @constructor
 */
function CopyMoveFilesDialog() {

    let self = this,
        dialogManager = DialogManager.getInstance(),
        source;

    this.settings = DialogManager.createDialogSettings({
        templateName: 'copyMoveFilesDialogTpl',
        modalWidth: DEFAULT_WIDTH
    });

    this.isComplete = ko.observable(false);
    this.doneWithErrors = ko.observable(false);
    this.targetDirItem = null; // directory item
    this.fileItems = ko.observableArray();
    this.inProgress = ko.observable(false);
    this.totalSize = ko.pureComputed(function() {
        return _.reduce(self.fileItems(), function(totalSize, fileItem) {
            return totalSize + fileItem.filesize;
        }, 0);
    });
    this.copiedFileItems = ko.observableArray();
    this.deletedFileItems = ko.observableArray();
    this.copiedSize = ko.pureComputed(function() {
        return _.reduce(self.copiedFileItems(), function(totalSize, fileItem) {
            return totalSize + fileItem.filesize;
        }, 0);
    });
    this.progressInPercent = ko.pureComputed(function() {
        let copiedSize = self.copiedSize(),
            totalSize = self.totalSize();

        return (totalSize) ? Math.round(100 * copiedSize / totalSize) : 0;
    });

    // TODO refactor: ditch fsExtra; use stream api; update progress continuously
    function startTransfer(moveMode) {
        let filesLeft = _.clone(self.fileItems()),
            transferFiles = function() {
                if (!filesLeft.length) {
                    return process.nextTick(self.afterComplete);
                }
                let fileItem = filesLeft.shift(),
                    srcPath = fileItem.path,
                    targetPath = nodePath.resolve(self.targetDirItem.path, fileItem.filenameRenamed || fileItem.filename),
                    srcSpectroPath = Spectrograms.getSpectroFilenameForAudioFilename(srcPath);

                fileItem.__copyFailed = false;
                fileItem.__deleteFailed = null;
                fileItem.__skipExists = false;

                // TODO fs.exists is deprecated
                if (nodeFs.existsSync(targetPath)) {
                    fileItem.__skipExists = true;
                    process.nextTick(transferFiles);
                    return;
                }

                nodeFsExtra.copy(srcPath, targetPath, function(err) {
                    if (err) {
                        fileItem.__copyFailed = true;
                        process.nextTick(transferFiles);
                        return;
                    }

                    self.copiedFileItems.push(fileItem);

                    let isSpectrogramCopied = false;

                    if (nodeFs.existsSync(srcSpectroPath)) {
                        let targetSpectroPath = Spectrograms.getSpectroFilenameForAudioFilename(targetPath);
                        try {
                            nodeFsExtra.copySync(srcSpectroPath, targetSpectroPath);
                            isSpectrogramCopied = true;
                        } catch (e) {
                            console.error('Failed to copy spectrogram %s to %s', srcSpectroPath, targetSpectroPath);
                        }
                    }

                    if (moveMode) {
                        try {
                            nodeFs.unlinkSync(srcPath);
                            self.deletedFileItems.push(fileItem);
                            fileItem.__deleteFailed = false;
                        } catch (e) {
                            fileItem.__deleteFailed = true;
                            console.error('Unable to delete file %s after copy.', srcPath, e);
                        }

                        if (isSpectrogramCopied && !fileItem.__deleteFailed) {
                            try {
                                nodeFs.unlinkSync(srcSpectroPath);
                            } catch (e) {
                                console.error('Failed to delete spectro file %s', srcSpectroPath);
                            }
                        }
                    }

                    process.nextTick(transferFiles);
                });
            };

        self.inProgress(true);
        transferFiles();
    }

    this.afterComplete = function() {
        self.doneWithErrors(!!(_.find(self.fileItems(), function(fileItem) {
            return fileItem.__copyFailed || fileItem.__deleteFailed || fileItem.__skipExists;
        })));
        self.isComplete(true);
        _.each(self.deletedFileItems(), function(fileItem) {
            source.files.remove(fileItem);
        });
    };

    /**
     * Triggered via data-bind by the template's ok button.
     */
    this.copyFiles = function() {
        startTransfer(false);
        return false;
    };

    /**
     * Triggered via data-bind by the template's ok button.
     */
    this.moveFiles = function() {
        startTransfer(true);
        return false;
    };

    this.close = function() {
        self.fileItems.removeAll();
        dialogManager.reset();
    };

    this.show = function() {
        dialogManager.showDialog(this);
        DialogManager.autoHeight();
    };


    this.init = function(opts) {
        Helper.assertObject(opts, 'invalid opts for CopyMoveFilesDialog.init()');
        Helper.assert(opts.source && opts.source instanceof PathWatcher,
                                'invalid source for CopyMoveFilesDialog.init()');
        Helper.assertObject(opts.targetDirItem, 'invalid targetDirItem for CopyMoveFilesDialog.init()');
        source = opts.source;
        self.inProgress(false);
        self.copiedFileItems.removeAll();
        self.deletedFileItems.removeAll();
        self.targetDirItem = opts.targetDirItem;
        self.fileItems(source.getVisibleSelectedFileItems());
        self.isComplete(false);
    };
}

module.exports = {getInstance};

