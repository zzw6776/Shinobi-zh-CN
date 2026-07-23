var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
const { getCpuUsageOnLinux, getRamUsageOnLinux } = require('./health/utils.js')
module.exports = function(s,config,lang,io){
    let lastLoggedCpu = new Date()
    let lastLoggedRam = new Date()
    const allowedLogInterval = 1000 * 1000 * 60 * 60 // 1 hour
    const criticalUtilization = 90
    function logCpu(percent){
        if(percent < criticalUtilization)return;
        const timeNow = new Date()
        if(timeNow - lastLoggedCpu > allowedLogInterval){
            lastLoggedCpu = new Date()
            s.systemLog(`CPU Reached Critical Utilization ${percent}`)
        }
    }
    function logRam(percent){
        if(percent < criticalUtilization)return;
        const timeNow = new Date()
        if(timeNow - lastLoggedRam > allowedLogInterval){
            lastLoggedRam = new Date()
            s.systemLog(`RAM Reached Critical Utilization ${percent}`)
        }
    }
    s.heartBeat = function(){
        setTimeout(s.heartBeat, 8000);
        io.sockets.emit('ping',{beat:1});
    }
    s.heartBeat()
    let hasProcStat = false
    try{
        fs.statSync("/proc/stat")
        hasProcStat = true
    }catch(err){

    }
    if(hasProcStat){
        s.cpuUsage = async () => {
            const percent = await getCpuUsageOnLinux()
            return percent
        }
    }else{
        s.cpuUsage = () => {
            return new Promise((resolve, reject) => {
                var k = {}
                switch(s.platform){
                    case'win32':
                        k.cmd = "@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
                    break;
                    case'darwin':
                        k.cmd = "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
                    break;
                    case'linux':
                        k.cmd = 'top -b -n 2 | awk \'toupper($0) ~ /^.?CPU/ {gsub("id,","100",$8); gsub("%","",$8); print 100-$8}\' | tail -n 1';
                    break;
                    case'freebsd':
                        k.cmd = 'vmstat 1 2 | awk \'END{print 100-$NF}\''
                    break;
                    case'openbsd':
                        k.cmd = 'vmstat -w 1 -c 2 | awk \'END{print 100-$NF}\''
                    break;
                }
                if(config.customCpuCommand){
                  exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
                      if(s.isWin===true) {
                          d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
                      }
                      resolve(d)
                      s.onGetCpuUsageExtensions.forEach(function(extender){
                          extender(d)
                      })
                  })
                } else if(k.cmd){
                     exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                         if(s.isWin===true){
                             d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                         }else if(s.platform == 'darwin') {
                             // on macos the cpu% is per core, so a 10 core machine can go up to 1000%
                             d=parseFloat(d.trim()) / s.coreCount
                         }
                         resolve(d)
                         s.onGetCpuUsageExtensions.forEach(function(extender){
                             extender(d)
                         })
                     })
                } else {
                    resolve(0)
                }
            })
        }
    }
    let hasProcMeminfo = false
    try{
        fs.statSync("/proc/meminfo")
        hasProcMeminfo = true
    }catch(err){

    }
    if(hasProcMeminfo){
        s.ramUsage = async () => {
            const used = await getRamUsageOnLinux()
            return used
        }
    }else{
        s.ramUsage = () => {
            return new Promise((resolve, reject) => {
                k={}
                switch(s.platform){
                    case'win32':
                        k.cmd = "wmic OS get FreePhysicalMemory /Value"
                    break;
                    case'darwin':
                        k.cmd = "vm_stat | awk '/^Pages free/{f=$3+0} /^Pages active/{a=$3+0} /^Pages inactive/{i=$3+0} /^Pages speculative/{sp=$3+0} /^Pages wired down/{w=$4+0} /^Pages occupied by compressor/{c=$5+0} END{print ((a+w+c)/(f+a+i+w+sp+c))*100}'"
                    break;
                    case'freebsd':
                	    k.cmd = "sysctl -n vm.stats.vm.v_page_count vm.stats.vm.v_free_count vm.stats.vm.v_inactive_count | awk 'NR==1{t=$1} NR==2{f=$1} NR==3{i=$1} END{print ((t-f-i)/t)*100}'"
                    break;
        	        case'openbsd':
                        k.cmd = "vmstat -s | awk '/pages managed$/{t=$1} /pages free$/{f=$1} END{print ((t-f)/t)*100}'"
                    break;
                    default:
                        k.cmd = "LANG=C free | grep Mem | awk '{print $7/$2 * 100.0}'";
                    break;
                }
                let percent = 0
                let used = 0
                if(k.cmd){
                    exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                        if(s.isWin===true){
                            const freeMb = parseInt(d.split('=')[1].trim()) / 1024
                            const totalMemInMb = s.totalmem/1024/1024
                            used = totalMemInMb - freeMb
                            percent=(used/totalMemInMb)*100
                        } else {
                            percent = d.trim()
                        }
                        resolve({
                            used,
                            percent
                        })
                        s.onGetRamUsageExtensions.forEach(function(extender){
                            extender(percent)
                        })
                    })
                }else{
                    resolve({
                        used,
                        percent
                    })
                }
            })
        }
    }
    if(config.childNodes.mode !== 'child'){
        if(config.logCpuAndRamDangerZone){
            setInterval(async () => {
                const cpu = await s.cpuUsage()
                const ram = await s.ramUsage()
                logCpu(cpu)
                logRam(ram.percent)
                s.tx({
                    f: 'os',
                    cpu: cpu,
                    ram: ram
                },'CPU')
            },10000)
        }else{
            setInterval(async () => {
                const cpu = await s.cpuUsage()
                const ram = await s.ramUsage()
                s.tx({
                    f: 'os',
                    cpu: cpu,
                    ram: ram
                },'CPU')
            },10000)
        }
    }
}
