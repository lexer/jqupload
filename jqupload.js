/**
 * Created by .
 * User: Oksana
 * Date: 3/11/11
 * Time: 11:11 AM
 * To change this template use File | Settings | File Templates.
 */

(function($) {
    var FileState = {
        Waiting: 0,
        Aborted: 1,
        Started: 2,
        Uploading: 3,
        Error: 4,
        Completed: 5
    };

    function File (id,name) {
        this.id = id;
        this.name = name;
        this.error = null;
        this.size = 1;
        this.received = 1;
        this.state = FileState.Waiting;
        this.startDate = null;

    }

     File.prototype = {

            elapsedTime: function() {
                return new Date() - this.startDate;
            },

            percent: function() {
                return ((this.received / this.size) * 100).toFixed(2);
            },

            leftTime: function() {
                return (this.size - this.received) / this.speed();
            },

            speed: function() {
                return this.received / this.elapsedTime();
            },

            abort:function() {
              this.state = FileState.Aborted;
              $(this).trigger("abort");
            },

            startUpload:function() {
                var self = this;
                this.state = FileState.Started;
                window.setTimeout(function(){
                    self.updateProgress();
                }, 5000);
            },

            updateProgress:function() {
                var self = this;
                $.ajax({
                        url: "/progress",
                        type: "GET",
                        headers: {
                            "X-Progress-ID": self.id
                        },
                        success: function(upload) {
                            if (upload.state === "uploading") {
                                self.size = upload.size;
                                self.received = upload.received;

                                if (self.state === FileState.Started) {
                                  $(self).trigger('started');
                                }
                                self.state = FileState.Uploading;
                                $(self).trigger('progress');

                                window.setTimeout(function(){
                                     self.updateProgress();
                                    }, 5000);
                            }

                            if (upload.state === "error" || upload.state === "done") {
                                if (upload.state === "done") {
//                                    self.onComplete(self);
                                    self.state = FileState.Completed;
                                    $(self).trigger('complete');

                                }

                                if (upload.state === "error") {
                                    self.state= FileState.Error;
                                     $(self).trigger('error');
                                }
                            }
                        }
                    });
            }
     };

    var UploadFile = function(container) {
        var self = this,
                files = [],
                fileInput,
                hiddenFormsContainer,
                uploadForm,
                settings = {
//                    onFileAdd: function() {},
                    onUploadStart: function() {},
                    uploadQueueLimit : 1
                },

                onChange = function (e) {
                    var fullName = fileInput.val();

                    var file = new File(getUUID(),fullName.match(/[^\/\\]+$/).toString());


                    $(file).one("complete", function() {
                        $(this).unbind("error");
                        $(this).unbind("abort");
                        onComplete(file);})
                            .one("error", function() {
                        $(this).unbind("complete");
                        $(this).unbind("abort");
                        onError(file);})
                            .one("abort", function() {
                        $(this).unbind("complete");
                        $(this).unbind("error");
                        onAbort(file);
                    });

                    files.push(file);

                    createNewForm(file);
                    tryUpload();
                },

                onComplete = function(file) {
                    getFileForm(file).remove();
                    tryUpload();
                },

                onError = function(file) {
                    getFileForm(file).remove();
                    tryUpload();
                },

                onAbort = function(file) {
                       getFileForm(file).find("iframe").attr('src', 'javascript'.concat(':false;'));
                       getFileForm(file).remove();
                       tryUpload();
                },

                createNewForm = function(file) {
					
                    var originalFormAction = uploadForm.attr("action");
                    uploadForm.find("iframe").remove();

//                    uploadForm.find("input[name='file']").unbind("change");
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
                        $(e.target).find("input[name='key']").attr("value", file.id + "/"+ '${filename}');
                        file.startUpload();
                    });

					uploadForm = cloneForm;
					fileInput = uploadForm.find("input[name='file']");
					fileInput.one("change", onChange);

//                    if (jQuery.isFunction(settings.onFileAdd)) {
//                       settings.onFileAdd(file);
//                    }
                    $(container).trigger("fileAdd.jqUpload",file);

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

                getFilesByState = function(fileState) {
                  return $.map(files,function(element){
                    if (element.state === fileState){
                        return element;
                    }
                    return null;
                  });
                },

                getWaitingFiles = function(){
                  return getFilesByState(FileState.Waiting);
                },

                getUploadingFiles = function(){
                  return getFilesByState(FileState.Uploading);
                },

                getStartedOrUploadingFiles =  function() {
                    return $.map(files,function(element){
                        if (element.state === FileState.Uploading || element.state === FileState.Started){
                            return element;
                        }
                        return null;
                    });
                },

                tryUpload = function() {
                    var waitingFiles = getWaitingFiles();
                    var startedOrUploadingFiles = getStartedOrUploadingFiles();
                    if (startedOrUploadingFiles.length < settings.uploadQueueLimit && waitingFiles.length > 0) {
                       var file =  waitingFiles[0];
                       getFileForm(file).submit();
                    }
                };

        this.updateProgress = function() {
           $.each(getUploadingFiles(), function(file) {
                file.updateProgress();
           }) ;

        };

        this.getFiles = function () {
            return files;
        };
        this.getUploadingFiles = function() {
           return getUploadingFiles();
        };

        this.getFileById = function(fileId) {
            var i;
            for (i = files.length - 1; i >= 0; i--) {
                if (files[i].id === fileId) {
                    return files[i];
                }
            }
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
//                $this.bind('fileAdd.jqUpload', methods.fileAdd);
            });
        },



        getFiles: function() {
               var $this = $(this),
                        data = $this.data('jqUpload');
               return data.upload.getFiles();
        },

        getUploadingFiles: function() {
                var $this = $(this),
                        data = $this.data('jqUpload');
               return data.upload.getUploadingFiles();
        },

        getFileById: function(fileId) {
            var $this = $(this),
                        data = $this.data('jqUpload');
               return data.upload.getFileById(fileId);
        },

        fileAdd: function(e) {
            //...
        },

        destroy : function() {

            return this.each(function() {

                var $this = $(this),
                        data = $this.data('jqUpload');

                $this.unbind('.jqUpload');
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
