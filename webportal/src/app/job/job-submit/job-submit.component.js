// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


// module dependencies
const breadcrumbComponent = require('../breadcrumb/breadcrumb.component.ejs');
const loadingComponent = require('../loading/loading.component.ejs');
const jobSubmitComponent = require('./job-submit.component.ejs');
const loading = require('../loading/loading.component');
const webportalConfig = require('../../config/webportal.config.json');
const userAuth = require('../../user/user-auth/user-auth.component');


const jobSubmitHtml = jobSubmitComponent({
  breadcrumb: breadcrumbComponent,
  loading: loadingComponent,
});

const isValidJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    alert('Please upload a valid json file: ' + e.message);
    return false;
  }
};

const submitJob = (jobConfig) => {
  userAuth.checkToken((token) => {
    loading.showLoading();
    $.ajax({
      url: `${webportalConfig.restServerUri}/api/v1/jobs/${jobConfig.jobName}`,
      data: jobConfig,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      type: 'PUT',
      dataType: 'json',
      success: (data) => {
        loading.hideLoading();
        if (data.error) {
          alert(data.message);
          $('#submitHint').text(data.message);
        } else {
          alert('submit success');
          $('#submitHint').text('submitted successfully!');
        }
        window.location.replace('/view.html');
      },
      error: (xhr, textStatus, error) => {
        const res = JSON.parse(xhr.responseText);
        alert(res.message);
      },
    });
  });
};

$('#sidebar-menu--submit-job').addClass('active');

$('#content-wrapper').html(jobSubmitHtml);
/*$(document).ready(() => {
  $(document).on('change', '#file', (event) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const jobConfig = event.target.result;
      if (isValidJson(jobConfig)) {
        submitJob(JSON.parse(jobConfig));
      }
    };
    reader.readAsText(event.target.files[0]);
  });
});*/
var param;
$(document).ready(()=>{
    $("#submit1").click(function () {
        console.log("hello");
        var formdata={};
        var t=$("#form1").serializeArray();
        var len = t.length

        // $.each(t,function () {
        //     formdata[this.name]=this.value;
        // });
        var taskRolesIndex = 0;
        for (var i=0; i<len;i++){
            if (t[i].name == "taskRoles"){
                taskRolesIndex = i;
                break;
            }
            //[this.name]=this.value;
        }
        for (var i = 0; i < taskRolesIndex; i++) {
            formdata[t[i].name]=t[i].value;
        }

        var taskRolesLines = (len - taskRolesIndex - 1)/6;
        var taskRolesValue = [];

        for (var i=0; i<taskRolesLines;i++){
            var fd = {};
            for (var j=1; j<=6; j++){
                fd[t[taskRolesIndex+j+i*6].name] = t[taskRolesIndex+j+i*6].value;
            }
            taskRolesValue.push(fd);
        }
        formdata["taskRoles"]=taskRolesValue;



        param=JSON.stringify(formdata);
        console.log(param);
        const jobConfig=param;
        if(isValidJson(jobConfig)){
            submitJob(JSON.parse(jobConfig));
        }
        // console.log($('#form1').serializeJSON());
        //  console.log(JSON.stringify($('#form1').serializeJSON()));
    });
});
//test

function dispaly(){

}
function disappear(){

}

/*var data = {};
//$(document).ready(() => {
    $("#submit1").click(function() {
        $('input[name]').each(function() {
            data[this.getAttribute('name')] = this.value;
        });
        console.log(JSON.stringify(data).serializeObject());
    });*/

$(document).ready(() => {
  $(document).on('change', '#file', (event) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const jobConfig = event.target.result;
      if (isValidJson(jobConfig)) {
        submitJob(JSON.parse(jobConfig));
      }
    };
    reader.readAsText(event.target.files[0]);
  });
});




module.exports = { submitJob };
