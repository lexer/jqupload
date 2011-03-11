/**
 * Created by .
 * User: Oksana
 * Date: 3/11/11
 * Time: 11:11 AM
 * To change this template use File | Settings | File Templates.
 */
(function($) {
    var defaultNamespace = 'file_upload';
    var UploadFile = function(container){
        var that = this,
            fileInput,
            uploadForm,
            settings = {
                namespace: defaultNamespace,
//                FileAdded: function() {},
                onAbort: function() { },
                beforeUpload: function() {},
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

//            getProgressID = function() {
//               var uuid = "";
//               var i = 0;
//               for (i = 0; i < 32; i++) {
//		            uuid += Math.floor(Math.random() * 16).toString(16);
//		       }
//
//               return uuid;
//            },


            legacyUpload = function (input, form, iframe, settings) {
                var originalTarget = form.attr('target');
//                    originalAction = form.attr('action'),
//                    originalMethod = form.attr('method'),

                iframe
                    .unbind('abort')
                    .bind('abort', function (e) {
                        iframe.readyState = 0;
                        // javascript:false as iframe src prevents warning popups on HTTPS in IE6
                        // concat is used here to prevent the "Script URL" JSLint error:
                        iframe.unbind('load').attr('src', 'javascript'.concat(':false;'));
                        if (jQuery.isFunction(settings.onAbort)) {
                            settings.onAbort([{name: input.val(), type: null, size: null}]);
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
//                    .attr('action', getUrl(settings.url))
//                    .attr('method', getMethod(settings))
                    .attr('target', iframe.attr('name'));
//                legacyUploadFormDataInit(input, form, settings);
                iframe.readyState = 2;
                form.get(0).submit();
              //  window.setInterval( function () {  fetch(uuid);  }, 5000 );

//                legacyUploadFormDataReset(input, form, settings);
                form
//                    .attr('action', originalAction)
//                    .attr('method', originalMethod)
                    .attr('target', originalTarget);
            },

            handleLegacyUpload = function (event, input, form) {
                // javascript:false as iframe src prevents warning popups on HTTPS in IE6:
                var iframe = $('<iframe src="javascript:false;" style="display:none" name="iframe_' +
                    settings.namespace + '_' + (new Date()).getTime() + '"></iframe>'),
                    uploadSettings = $.extend({}, settings);
                uploadSettings.fileInput = input;
                uploadSettings.uploadForm = form;
                iframe.readyState = 0;
                iframe.abort = function () {
                    iframe.trigger('abort');
                };
                iframe.bind('load', function () {
                    iframe.unbind('load');
                    if (jQuery.isFunction(uploadSettings.beforeUpload)) {
                        uploadSettings.beforeUpload([{name: input.val(), type: null, size: null}]);
                    }

                    legacyUpload(input, form, iframe, uploadSettings);
                }).appendTo(form);
            },

//            handleUpload = function(event, input, form) {
//                var iframe = $('<iframe src="javascript:false;" style="display:none" name="iframe_' + settings.namespace + '_' + (new Date()).getTime() + '"></iframe>');
//                iframe.readyState = 0;
//                iframe.unbind("load").bind('load', function() {
//                    iframe.unbind('load');
//                    handleFileAdded(event, input, form, iframe);
//                    upload(input, form, iframe);
//                }).appendTo(form);
//            },

//            handleFileAdded = function(event, input, form, iframe){
//                settings.FileAdded(input.val(), null);
//            },

//            fetch = function(uuid) {
//                $.ajax({
//                          url: "/progress",
//                          type: "GET",
//                          headers: {
//                            "X-Progress-ID":uuid
//                          },
//
//                          success: function(data){
//                            var upload = eval(data);
//                          }
//                });
//            },

//            upload = function(input, form, iframe) {
//                var originalAction = form.attr('action');
//                var originalMethod = form.attr('method');
//                var originalTarget = form.attr('target');
//
//                var uuid = getProgressID();
//                var url = settings.url + "/?X-Progress-ID=" + uuid;
//
//                form
//                    .attr('action', url)
//                    .attr('method', "POST")
//                    .attr('target', iframe.attr('name'));
//
//                form.submit();
//                window.setInterval( function () {  fetch(uuid);  }, 5000 );
//
//                form
//                   .attr('action', originalAction)
//                   .attr('method', originalMethod)
//                   .attr('target', originalTarget);
//            },

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
        }
    };

    var methods = {
        init : function(options) {
            return this.each(function () {
                (new UploadFile($(this))).init(options);
            });
        }
    };

    $.fn.jqUpload = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.ajaxForm');
        }
    };
})(jQuery);
