// This file's contents were referenced from https://gist.github.com/sidwarkd/9578213
const fs = require('fs');
const calculateCPUPercentage = function(oldVals, newVals){
    var totalDiff = newVals.total - oldVals.total;
    var activeDiff = newVals.active - oldVals.active;
    return Math.ceil((activeDiff / totalDiff) * 100);
};
function getValFromLine(line){
  var match = line.match(/[0-9]+/gi);
  if(match !== null)
    return parseInt(match[0]);
  else
    return null;
};
const currentCPUInfo = {
    total: 0,
    active: 0
}
let lastCPUInfo = {
    total: 0,
    active: 0
}
exports.getCpuUsageOnLinux = () => {
    return new Promise((resolve,reject) => {
        const getUsage = function(callback){
            fs.readFile("/proc/stat" ,'utf8', function(err, data){
                var lines = data.split('\n');
                var cpuTimes = lines[0].match(/[0-9]+/gi);
                currentCPUInfo.total = 0;
                currentCPUInfo.idle = parseInt(cpuTimes[3]) + parseInt(cpuTimes[4]);
                for (var i = 0; i < cpuTimes.length; i++){
                  currentCPUInfo.total += parseInt(cpuTimes[i]);
                }
                currentCPUInfo.active = currentCPUInfo.total - currentCPUInfo.idle
                currentCPUInfo.percentUsed = calculateCPUPercentage(lastCPUInfo, currentCPUInfo);
                lastCPUInfo = Object.assign({},currentCPUInfo)
                callback(currentCPUInfo.percentUsed)
            })
        }
        getUsage(function(percentage){
            setTimeout(function(){
                getUsage(function(percentage){
                    resolve(percentage);
                })
            }, 3000)
        })
    })
}
exports.getRamUsageOnLinux = () => {
    return new Promise((resolve,reject) => {
        fs.readFile("/proc/meminfo", 'utf8', function(err, data){
            if(err)return resolve({ used: 0, percent: 0 });
            const meminfo = {};
            data.split('\n').forEach((line) => {
                const key = line.split(':')[0];
                if(key)meminfo[key] = getValFromLine(line);
            });
            // Page cache and reclaimable slab are handed back the moment anything
            // needs the memory, so counting them as used made a busy NVR (which
            // fills cache with recordings) look like it was leaking toward 100%.
            // MemAvailable is the kernel's own estimate of what is actually free;
            // older kernels without it get the same sum computed by hand.
            const totalKb = meminfo.MemTotal || 0;
            const availableKb = meminfo.MemAvailable !== undefined ?
                meminfo.MemAvailable :
                (meminfo.MemFree || 0) + (meminfo.Buffers || 0) + (meminfo.Cached || 0) + (meminfo.SReclaimable || 0);
            const total = Math.floor(totalKb / 1024);
            const used = Math.floor((totalKb - availableKb) / 1024);
            const percentUsed = total ? Math.ceil((used / total) * 100) : 0;
            resolve({
                used: used,
                percent: percentUsed,
            });
        })
    })
}
