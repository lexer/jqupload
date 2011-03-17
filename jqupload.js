/**
 * Created by .
 * User: Oksana
 * Date: 3/11/11
 * Time: 11:11 AM
 * To change this template use File | Settings | File Templates.
 */

(function($) {

    var UploadFile = function(container) {
        var self = this,
                parallelUploadSize = 3,
                uploadQueue = [],
                filesQueue = [],
                fileInput,
                hiddenFormsContainer,
                uploadForm,
                settings = {
                    onAbort: function() {},
                    onFileAdd: function() {},
                    onUploadStart: function() {},
                    onProgressChange: function() {},
                    onComplete: function() {},
                    onError: function() {},
                    mockProgress:false,
                    mockFileSize: 1024 * 1024
                },

                onChange = function (e) {
                    var fullName = fileInput.val();
                    var file = {
                        name: fullName.match(/[^\/\\]+$/).toString(),
                        id: getUUID(),
                        error: null,
                        size: null,
                        percent : 0
                    };

                    filesQueue.push(file);

                    createNewForm(file);

                    tryUpload();
                },


                onComplete = function(file) {
                    removeFile(file, uploadQueue);
                    
                    if (jQuery.isFunction(settings.onComplete)) {
                        settings.onComplete(file);
                    }
                    tryUpload();
                },

                onError = function(file) {
                    removeFile(file, uploadQueue);

                    if (jQuery.isFunction(settings.onError)) {
                      settings.onError(file);
                    }
                    tryUpload();
                },

                removeFile = function(file, collection) {
                    var i;
                    for (i = collection.length - 1; i >= 0; i--) {
                        if (collection[i].id === file.id) {
                            collection.splice(i, 1);
                        }
                    }
                },

                createNewForm = function(file) {
					
                    var originalFormAction = uploadForm.attr("action");
                    uploadForm.find("iframe").remove();

                    uploadForm.find("input[name='file']").unbind("change");
					var cloneForm = uploadForm.clone();
					var id = file.id;

					var iframe = $('<iframe src="javascript:false;" style="display:none" name="iframe_' + id + '"></iframe>');

                    uploadForm.attr('id', "form_" + id);
                    uploadForm.attr('target', iframe.attr('name'));
                    uploadForm.attr("action", originalFormAction + '?X-Progress-ID=' + file.id);
                    uploadForm.find("div input[name='utf8']").remove();
                    uploadForm.find("div input[name='authenticity_token']").remove();
					iframe.appendTo(uploadForm);
					
                    cloneForm[0].reset();
                    uploadForm.replaceWith(cloneForm);
                    uploadForm.appendTo(hiddenFormsContainer);
					
                    uploadForm.submit(function(e) {
                        if (jQuery.isFunction(settings.onUploadStart)) {
                            settings.onUploadStart(file, $(e.target));
                        }
                        var intervalId = window.setInterval(function () {
                            file.timerId = intervalId;
                            fetch(file);
                        }, 5000);

                    });

					uploadForm = cloneForm;
					fileInput = uploadForm.find("input[name='file']");
					fileInput.change(onChange);

                    if (jQuery.isFunction(settings.onFileAdd)) {
                       settings.onFileAdd(file);
                    }

					return uploadForm;
                },

                getUUID = function() {
                    var uuid = "";
                    var i = 0;
                    for (i = 0; i < 32; i++) {
                        uuid += Math.floor(Math.random() * 16).toString(16);
                    }

                    return uuid;
                },

                getFileForm = function(file) {
                     return hiddenFormsContainer.find("#form_" + file.id);
                },

                getFile = function(id, collection) {
                    var i;
                    for (i = collection.length - 1; i >= 0; i--) {
                        if (collection[i].id === id) {
                            return collection[i];
                        }
                    }
                },

                tryUpload = function() {
                    if (uploadQueue.length < parallelUploadSize && filesQueue.length > 0) {
                        var file = filesQueue.shift();
                        uploadQueue.push(file);
                        getFileForm(file).submit();
                        
                    }
                },


                fetch = function(file) {
                    if (settings.mockProgress) {
                        file.size = settings.mockFileSize;
                        file.percent = file.percent + 50;
                        settings.onProgressChange(file);
                        if (file.percent == 100) {

                            settings.onComplete(file);
                            window.clearTimeout(file.timerId);
                        }

                        return;
                    }


                    $.ajax({
                        url: "/progress",
                        type: "GET",
                        headers: {
                            "X-Progress-ID":file.id
                        },
                        success: function(upload) {
                            if (upload.state === "uploading") {
                                file.size = upload.size;
                                file.percent = (upload.received / upload.size) * 100;
                                if (jQuery.isFunction(settings.onProgressChange)) {
                                    settings.onProgressChange(file);
                                }
                            }

                            if (upload.state === "error" || upload.state === "done") {
                                if (upload.state === "done") {
                                    file.percent = 100;
                                    onComplete(file);
                                }

                                if (upload.state === "error") {
                                    onError(file, upload);
                                }
                                window.clearTimeout(file.timerId);
                                getFileForm(file).remove();
                            }
                        }
                    });
                };

        this.init = function(options) {
            if (options) {
                $.extend(settings, options);
            }
            uploadForm = (container.is('form') ? container : container.find('form'));
            fileInput = uploadForm.find('input:file');
			
            hiddenFormsContainer =  $("<div style='display:none;'></div>").attr("id", "forms_"+container.attr("id"));
            hiddenFormsContainer.insertAfter(container);

            fileInput.change(onChange);
        };

        this.abort = function(fileId) {
            var file = getFile(fileId, uploadQueue);

            if (file) {
                window.clearInterval(file.timerId);
                getFileForm(file).find("iframe").attr('src', 'javascript'.concat(':false;'));
                getFileForm(file).remove();
                removeFile(file, uploadQueue);
                tryUpload();
            } else {
                file = getFile(fileId, filesQueue);
                if (file) {
                    getFileForm(file).remove();
                    removeFile(file, filesQueue);
                }
            }

            if (jQuery.isFunction(settings.onAbort)) {
                settings.onAbort(file);
            }
        };
    };

    var methods = {
        init : function(options) {
            return this.each(function () {
                var $this = $(this),
                        data = $this.data('jqUpload');
                if (!data) {
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

        upload: function() {
            return this.each(function () {
                var fileUpload = $(this).data('jqUpload').upload;
                fileUpload.upload();
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
