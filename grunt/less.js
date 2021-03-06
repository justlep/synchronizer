module.exports = function (/* grunt, cfg */) {
    'use strict';

    return {
        options: {
            compress: true,
            dumpLineNumbers: 'all',
            sourceMap: true,
            relativeUrls: true
        },
        styles: {
            files: {
                'src/css/styles.css': 'src/less/styles.less'
            }
        },
        uikit: {
            files: {
                'src/css/uikit.css': 'src/less/uikit.less'
            }
        }
    };

};