/**
 * Created by .
 * User: Oksana
 * Date: 3/11/11
 * Time: 11:11 AM
 * To change this template use File | Settings | File Templates.
 */
(function($) {
    var defaultNamespace = 'file_upload';
    var UploadFile = function(container) {
        var that = this,
                fileInput,
                uploadForm,
                settings = {
                    namespace: defaultNamespace,
//                FileAdded: function() {},
                    onAbort: function() {
                    },
                    beforeUpload: function() {
                    },
                    onProgressChange: function() {
                    },
                    onComplete: function() {
                    },
                    onError: function() {
                    },
                    url: "/upload"
                },
                initEventHandlers = function() {
                    fileInput.change(onChange);
                },
                onChange = function (e) {
                    var input = $(e.target);
                    var form = $(e.target.form);
                    handleLegacyUpload(e, input, form);
                },

                getUUID = function() {
                    var uuid = "";
                    var i = 0;
                    for (i = 0; i < 32; i++) {
                        uuid += Math.floor(Math.random() * 16).toString(16);
                    }

                    return uuid;
                },


                legacyUpload = function (input, form, iframe, file, settings) {
                    var originalTarget = form.attr('target'),
                        originalAction = form.attr('action');
//                    originalMethod = form.attr('method'),

                    iframe
                        .unbind('abort')
                        .bind('abort', function (e) {
                            iframe.readyState = 0;
                            // javascript:false as iframe src prevents warning popups on HTTPS in IE6
                            // concat is used here to prevent the "Script URL" JSLint error:
                            iframe.unbind('load').attr('src', 'javascript'.concat(':false;'));
                            if (jQuery.isFunction(settings.onAbort)) {
                                settings.onAbort(file);
                            }
                        })
                        .unbind('load')
                        .bind('load', function (e) {
                            iframe.readyState = 4;
    //                        if (typeof settings.onLoad === func) {
    //                            settings.onLoad(e, [{name: input.val(), type: null, size: null}], 0, iframe, settings);
    //                        }
                            // Fix for IE endless progress bar activity bug (happens on form submits to iframe targets):
                            $('<iframe src="javascript:false;" style="display:none"></iframe>').appendTo(form).remove();
                        });

                    form
                        .attr('target', iframe.attr('name'))
                        .attr('action', form.attr('action') + '?X-Progress-ID=' + file.id);
//                    .attr('method', getMethod(settings))

                    iframe.readyState = 2;
                    form.get(0).submit();
                    var intervalId = window.setInterval(function () {
                        fetch(file, intervalId);
                    }, 5000);

                    form.attr('target', originalTarget)
                            .attr('action', originalAction);
//                    .attr('method', originalMethod)

                },

                handleLegacyUpload = function (event, input, form) {
                    // javascript:false as iframe src prevents warning popups on HTTPS in IE6:
                    var uuid = getUUID();
                    var iframe = $('<iframe src="javascript:false;" style="display:none" name="iframe_' +
                            uuid + '"></iframe>'),
                            uploadSettings = $.extend({}, settings);
                    var file = {
                        name: input.val(),
                        id: uuid,
                        error: null,
                        size: null,
                        progress: 0
                    };

                    iframe.readyState = 0;

                    iframe.bind('load',
                            function () {
                                iframe.unbind('load');
                                if (jQuery.isFunction(uploadSettings.beforeUpload)) {
                                    uploadSettings.beforeUpload(file);
                                }

                                legacyUpload(input, form, iframe, file, uploadSettings);
                            }).appendTo(form);
                },

                fetch = function(file, intervalId) {
                    $.ajax({
                        url: "/progress",
                        type: "GET",
                        headers: {
                            "X-Progress-ID":file.id
                        },

                        success: function(data) {
                            var upload = eval(data);
                            if (upload.state == "uploading") {
                                file.size = upload.size;
                                file.percent = (upload.received / upload.size) * 100;
                                settings.onProgressChange(file);

                            }
                            if (upload.state == "error" || upload.state == "done") {

                                if (upload.state == "done") {
                                    file.percent = 100;
                                    settings.onComplete(file);
                                }

                                if (upload.state == "error") {
                                    settings.onError(file);
                                }

                                window.clearTimeout(intervalId);
                            }
                        }
                    });
                },

                initUploadForm = function() {
                    uploadForm = (container.is('form') ? container : container.find('form'));
                },

                initFileInput = function() {
                    fileInput = uploadForm.find('input:file');
                };

        this.init = function(options) {
            if (options) {
                $.extend(settings, options);
            }

            initUploadForm();
            initFileInput();
            initEventHandlers();
        };

        this.abort = function(fileId) {
            container.find("iframe[name='iframe_" + fileId + "']").trigger('abort');
        }
    };

    var methods = {
        init : function(options) {
            return this.each(function () {

                var $this = $(this),
                        data = $this.data('jqUpload');

                if (! data) {

                    var upload = new UploadFile($this);
                    upload.init(options);

                    $(this).data('jqUpload', {
                        target : $this,
                        upload : upload
                    });

                }
            });
        },

        abort : function(fileId) {
            return this.each(function () {
                var fileUpload = $(this).data('jqUpload').upload;
                fileUpload.abort(fileId);
            });
        },

        destroy : function() {
            return this.each(function() {

                var $this = $(this),
                        data = $this.data('jqUpload');

                $(window).unbind('.jqUpload');
                data.upload.remove();
                $this.removeData('jqUpload');
            })
        }
    };

    $.fn.jqUpload = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.jqUpload');
        }
    };
})(jQuery);
