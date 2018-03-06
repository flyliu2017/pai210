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
const path = require('path');
const fse = require('fs-extra');
const async = require('async');
const unirest = require('unirest');
const mustache = require('mustache');
const childProcess = require('child_process');
const logger = require('../config/logger');
const launcherConfig = require('../config/launcher');
const yarnContainerScriptTemplate = require('../templates/yarnContainerScript');
const dockerContainerScriptTemplate = require('../templates/dockerContainerScript');


class Job {
  constructor(name, next) {
    this.name = name;
    this.getJob(name, (job) => {
      for (let key of Object.keys(job)) {
        this[key] = job[key];
      }
      next(this);
    });
  }

  convertJobState(frameworkState, exitCode) {
    let jobState = '';
    switch (frameworkState) {
      case 'FRAMEWORK_WAITING':
      case 'APPLICATION_CREATED':
      case 'APPLICATION_LAUNCHED':
      case 'APPLICATION_WAITING':
        jobState = 'WAITING';
        break;
      case 'APPLICATION_RUNNING':
      case 'APPLICATION_RETRIEVING_DIAGNOSTICS':
      case 'APPLICATION_COMPLETED':
        jobState = 'RUNNING';
        break;
      case 'FRAMEWORK_COMPLETED':
        if (typeof exitCode !== 'undefined' && parseInt(exitCode) === 0) {
          jobState = 'SUCCEEDED';
        } else {
          jobState = 'FAILED';
        }
        break;
      default:
        jobState = 'UNKNOWN';
    }
    return jobState;
  }

  getJobList(next) {
    unirest.get(launcherConfig.frameworksPath())
        .headers(launcherConfig.webserviceRequestHeaders)
        .end((res) => {
          const resJson = typeof res.body === 'object' ?
              res.body : JSON.parse(res.body);
          const jobList = resJson.summarizedFrameworkInfos.map((frameworkInfo) => {
            let retries = 0;
            ['transientNormalRetriedCount', 'transientConflictRetriedCount',
                'nonTransientRetriedCount', 'unKnownRetriedCount'].forEach((retry) => {
              retries += frameworkInfo.frameworkRetryPolicyState[retry];
            });
            return {
              name: frameworkInfo.frameworkName,
              username: frameworkInfo.userName,
              state: this.convertJobState(frameworkInfo.frameworkState, frameworkInfo.applicationExitCode),
              subState: frameworkInfo.frameworkState,
              retries: retries,
              createdTime: frameworkInfo.firstRequestTimestamp || new Date(2018, 1, 1).getTime(),
              completedTime: frameworkInfo.frameworkCompletedTimestamp,
              appExitCode: frameworkInfo.applicationExitCode,
            };
          });
          jobList.sort((a, b) => b.createdTime - a.createdTime);
          next(jobList);
        });
  }

  getJob(name, next) {
    unirest.get(launcherConfig.frameworkPath(name))
        .headers(launcherConfig.webserviceRequestHeaders)
        .end((frameworkRes) => {
          const framework = typeof frameworkRes.body === 'object' ?
              frameworkRes.body : JSON.parse(frameworkRes.body);
          let job = {
            jobStatus: {
              name,
              username: 'unknown',
              state: 'JOB_NOT_FOUND',
            },
            taskRoles: {},
          };
          if (framework.exception !== undefined) {
            next(job, new Error('job not found'));
          } else {
            const frameworkStatus = framework.aggregatedFrameworkStatus.frameworkStatus;
            if (frameworkStatus) {
              const jobState = this.convertJobState(
                  frameworkStatus.frameworkState,
                  frameworkStatus.applicationExitCode);
              let jobRetryCount = 0;
              const jobRetryCountInfo = frameworkStatus.frameworkRetryPolicyState;
              jobRetryCount =
                jobRetryCountInfo.transientNormalRetriedCount +
                jobRetryCountInfo.transientConflictRetriedCount +
                jobRetryCountInfo.nonTransientRetriedCount +
                jobRetryCountInfo.unKnownRetriedCount;
              job.jobStatus = {
                name,
                username: 'unknown',
                state: jobState,
                subState: frameworkStatus.frameworkState,
                retries: jobRetryCount,
                createdTime: frameworkStatus.frameworkCreatedTimestamp,
                completedTime: frameworkStatus.frameworkCompletedTimestamp,
                appId: frameworkStatus.applicationId,
                appProgress: frameworkStatus.applicationProgress,
                appTrackingUrl: frameworkStatus.applicationTrackingUrl,
                appLaunchedTime: frameworkStatus.applicationLaunchedTimestamp,
                appCompletedTime: frameworkStatus.applicationCompletedTimestamp,
                appExitCode: frameworkStatus.applicationExitCode,
                appExitDiagnostics: frameworkStatus.applicationExitDiagnostics,
                appExitType: frameworkStatus.applicationExitType,
              };
            }
            const frameworkRequest = framework.aggregatedFrameworkRequest.frameworkRequest;
            if (frameworkRequest.frameworkDescriptor) {
              job.jobStatus.username = frameworkRequest.frameworkDescriptor.user.name;
            }
            const taskRoleStatuses = framework.aggregatedFrameworkStatus.aggregatedTaskRoleStatuses;
            if (taskRoleStatuses) {
              for (let taskRole of Object.keys(taskRoleStatuses)) {
                job.taskRoles[taskRole] = {
                  taskRoleStatus: {name: taskRole},
                  taskStatuses: [],
                };
                for (let task of taskRoleStatuses[taskRole].taskStatuses.taskStatusArray) {
                  job.taskRoles[taskRole].taskStatuses.push({
                    taskIndex: task.taskIndex,
                    containerId: task.containerId,
                    containerIp: task.containerIp,
                    containerGpus: task.containerGpus,
                    containerLog: task.containerLogHttpAddress,
                  });
                }
              }
            }
            next(job);
          }
        });
  }

  putJob(name, data, next) {
    if (!data.outputDir.trim()) {
      data.outputDir = `${launcherConfig.hdfsUri}/Output/${data.username}/${name}`;
    } else {
      data.outputDir = data.outputDir.replace('$PAI_DEFAULT_FS_URI', launcherConfig.hdfsUri);
    }
    if (data.outputDir.match(/^hdfs:\/\//)) {
      childProcess.exec(
          `HADOOP_USER_NAME=${data.username} hdfs dfs -mkdir -p ${data.outputDir}`,
          (err, stdout, stderr) => {
            if (err) {
              logger.warn('mkdir %s error for job %s\n%s', data.outputDir, name, err.stack);
            }
          });
    }
    const jobDir = path.join(launcherConfig.jobRootDir, data.username, name);
    fse.ensureDir(jobDir, (err) => {
      if (err) {
        return next(err);
      } else {
        let frameworkDescription;
        async.parallel([
          (parallelCallback) => {
            async.each(['tmp', 'finished'], (file, eachCallback) => {
              fse.ensureDir(path.join(jobDir, file), (err) => eachCallback(err));
            }, (err) => {
              parallelCallback(err);
            });
          },
          (parallelCallback) => {
            async.each([...Array(data.taskRoles.length).keys()], (idx, eachCallback) => {
              fse.outputFile(
                  path.join(jobDir, 'YarnContainerScripts', `${idx}.sh`),
                  this.generateYarnContainerScript(data, idx),
                  (err) => eachCallback(err));
            }, (err) => {
              parallelCallback(err);
            });
          },
          (parallelCallback) => {
            async.each([...Array(data.taskRoles.length).keys()], (idx, eachCallback) => {
              fse.outputFile(
                  path.join(jobDir, 'DockerContainerScripts', `${idx}.sh`),
                  this.generateDockerContainerScript(data, idx),
                  (err) => eachCallback(err));
            }, (err) => {
              parallelCallback(err);
            });
          },
          (parallelCallback) => {
            fse.outputJson(
                path.join(jobDir, launcherConfig.jobConfigFileName),
                data,
                {'spaces': 2},
                (err) => parallelCallback(err));
          },
          (parallelCallback) => {
            frameworkDescription = this.generateFrameworkDescription(data);
            fse.outputJson(
                path.join(jobDir, launcherConfig.frameworkDescriptionFilename),
                frameworkDescription,
                {'spaces': 2},
                (err) => parallelCallback(err));
          },
        ], (parallelError) => {
          if (parallelError) {
            return next(parallelError);
          } else {
            childProcess.exec(
                `HADOOP_USER_NAME=${data.username} hdfs dfs -mkdir -p ${launcherConfig.hdfsUri}/Container/${data.username} &&
                HADOOP_USER_NAME=${data.username} hdfs dfs -put -f ${jobDir} ${launcherConfig.hdfsUri}/Container/${data.username}/`,
                (err, stdout, stderr) => {
                  logger.info('[stdout]\n%s', stdout);
                  logger.info('[stderr]\n%s', stderr);
                  if (err) {
                    return next(err);
                  } else {
                    unirest.put(launcherConfig.frameworkPath(name))
                        .headers(launcherConfig.webserviceRequestHeaders)
                        .send(frameworkDescription)
                        .end((res) => next());
                  }
                });
          }
        });
      }
    });
  }

  deleteJob(name, data, next) {
    unirest.get(launcherConfig.frameworkRequestPath(name))
      .headers(launcherConfig.webserviceRequestHeaders)
      .end((requestRes) => {
        const requestResJson = typeof requestRes.body === 'object' ?
            requestRes.body : JSON.parse(requestRes.body);
        if (!requestResJson.frameworkDescriptor) {
          next(new Error('unknown job'));
        } else if (data.username === requestResJson.frameworkDescriptor.user.name || data.admin) {
          unirest.delete(launcherConfig.frameworkPath(name))
            .headers(launcherConfig.webserviceRequestHeaders)
            .end(() => next());
        } else {
          next(new Error('can not delete other user\'s job'));
        }
      });
  }

  generateYarnContainerScript(data, idx) {
    const yarnContainerScript = mustache.render(
        yarnContainerScriptTemplate, {
          'idx': idx,
          'hdfsUri': launcherConfig.hdfsUri,
          'taskData': data.taskRoles[idx],
          'jobData': data,
        });
    return yarnContainerScript;
  }

  generateDockerContainerScript(data, idx) {
    let tasksNumber = 0;
    for (let i = 0; i < data.taskRoles.length; i ++) {
      tasksNumber += data.taskRoles[i].taskNumber;
    }
    const dockerContainerScript = mustache.render(
        dockerContainerScriptTemplate, {
          'idx': idx,
          'tasksNumber': tasksNumber,
          'taskRoleList': data.taskRoles.map((x) => x.name).join(','),
          'taskRolesNumber': data.taskRoles.length,
          'hdfsUri': launcherConfig.hdfsUri,
          'taskData': data.taskRoles[idx],
          'jobData': data,
        });
    return dockerContainerScript;
  }

  generateFrameworkDescription(data) {
    const gpuType = data.gpuType || null;
    const killOnCompleted = (data.killAllOnCompletedTaskNumber > 0);
    const frameworkDescription = {
      'version': 10,
      'user': {'name': data.username},
      'taskRoles': {},
      'platformSpecificParameters': {
        'queue': 'default',
        'taskNodeGpuType': gpuType,
        'killAllOnAnyCompleted': killOnCompleted,
        'killAllOnAnyServiceCompleted': killOnCompleted,
        'generateContainerIpList': true,
      },
    };
    for (let i = 0; i < data.taskRoles.length; i ++) {
      const taskRole = {
        'taskNumber': data.taskRoles[i].taskNumber,
        'taskService': {
          'version': 0,
          'entryPoint': `source YarnContainerScripts/${i}.sh`,
          'sourceLocations': [`/Container/${data.username}/${data.jobName}/YarnContainerScripts`],
          'resource': {
            'cpuNumber': data.taskRoles[i].cpuNumber,
            'memoryMB': data.taskRoles[i].memoryMB,
            'gpuNumber': data.taskRoles[i].gpuNumber,
            'portRanges': [],
            'diskType': 0,
            'diskMB': 0,
          },
        },
      };
      frameworkDescription.taskRoles[data.taskRoles[i].name] = taskRole;
    }
    return frameworkDescription;
  }
}

// module exports
module.exports = Job;
