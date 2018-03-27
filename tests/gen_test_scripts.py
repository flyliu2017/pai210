#! /bin/python

from jinja2 import Template
import collections

token = open('token').read().strip()
print token

json_tmpl_path = 'testpai.json.template'
shell_tmpl = '{% for job in jobs %} '\
               'curl -H "Content-type: application/json" '\
               '-H "Authorization: Bearer {{token}}" '\
               '-X PUT http://192.168.2.210:9186/api/v1/jobs/{{job}} '\
               '-d @{{jobs[job]}}\nsleep 1\n' \
             '{% endfor %}'
print shell_tmpl

jobs = collections.OrderedDict()
for i in range(1, 10):
  jobName = 'jobName_{0}'.format(i)
  content = ''
  with open(json_tmpl_path) as f:
    content = f.read()
  tmpl = Template(content)
  with open('generated/{0}.json'.format(jobName), 'w') as f: 
    f.write(tmpl.render({"jobName": jobName}))
  jobs[jobName] = 'generated/{0}.json'.format(jobName)

for job in jobs:
  print job

sh_tmpl = Template(shell_tmpl)
with open('generated/start.sh', 'w') as f:
  f.write(sh_tmpl.render({"jobs": jobs, "token": token}))  
  
