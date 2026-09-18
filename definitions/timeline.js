module.exports = (s,config,lang,Theme) => {
    const textWhiteOnBgDark = Theme.isDark ? 'text-white' : ''
    return {
         "section": "Timeline",
         "blocks": {
             "Search Settings": {
                "name": lang["Timeline"],
                "color": "blue",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "flex-direction-column",
                "info": [
                    {
                        "fieldType": "div",
                        "class": "row m-0",
                        "id": "timeline-video-canvas",
                    },
                    {
                        "fieldType": "div",
                        "class": "row p-1 m-0",
                        "id": "timeline-info",
                        "divContent": `
                        <div class="text-center">
                          <span class="current-time font-monospace ${textWhiteOnBgDark}"></span>
                        </div>`
                    },
                    {
                        "fieldType": "div",
                        "class": "p-2",
                        "id": "timeline-controls",
                        "divContent": `
                        <div class="text-center">
                            <div class="btn-group">
                                <a class="btn btn-sm btn-default" timeline-action="jumpPrev" title="${lang.jumptoPreviousVideo}"><i class="fa fa-angle-double-left"></i></a>
                                <a class="btn btn-sm btn-default" timeline-action="jumpLeft" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-left"></i></a>
                                <a class="btn btn-sm btn-primary" timeline-action="playpause" title="${lang.Play}/${lang.Pause}"><i class="fa fa-play-circle-o"></i></a>
                                <a class="btn btn-sm btn-default" timeline-action="jumpRight" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-right"></i></a>
                                <a class="btn btn-sm btn-default" timeline-action="jumpNext" title="${lang.jumptoNextVideo}"><i class="fa fa-angle-double-right"></i></a>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-default btn-success" timeline-action="speed" speed="1" title="${lang.Speed} x1">x1</a>
                                <a class="btn btn-sm btn-default" timeline-action="speed" speed="2" title="${lang.Speed} x2">x2</a>
                                <a class="btn btn-sm btn-default" timeline-action="speed" speed="5" title="${lang.Speed} x5">x5</a>
                                <a class="btn btn-sm btn-default" timeline-action="speed" speed="7" title="${lang.Speed} x7">x7</a>
                                <a class="btn btn-sm btn-default" timeline-action="speed" speed="10" title="${lang.Speed} x10">x10</a>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-12">1</a>
                                <a class="btn btn-sm btn-default btn-success" timeline-action="gridSize" size="md-6">2</a>
                                <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-4">3</a>
                            </div>
                            <div class="btn-group">
                                <input class="form-control form-control-sm" id="timeline-video-object-search" placeholder="${lang['Search Tags']}">
                            </div>
                            <div class="btn-group">
                                <select class="form-control form-control-sm" id="timeline-video-type">
                                  <option value="">${lang.Local}</option>
                                  <option value="cloud">${lang.Cloud}</option>
                                  <option value="archive">${lang.Archive}</option>
                                </select>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-primary" timeline-action="autoGridSizer" title="${lang.autoResizeGrid}"><i class="fa fa-expand"></i></a>
                                <a class="btn btn-sm btn-primary" timeline-action="playUntilVideoEnd" title="${lang.playUntilVideoEnd}"><i class="fa fa-step-forward"></i></a>
                                <a class="btn btn-sm btn-primary btn-warning" timeline-action="dontShowDetection" title="${lang['Hide Detection on Stream']}"><i class="fa fa-grav"></i></a>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-success" timeline-action="downloadAll" title="${lang.Download}"><i class="fa fa-download"></i></a>
                                <a class="btn btn-sm btn-primary" timeline-action="editTagsAll" title="${lang.editTagsOfVideosOnScreen}"><i class="fa fa-tags"></i></a>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-default" class_toggle="show-non-playing" data-target="#timeline-video-canvas" icon-toggle="fa-eye fa-eye-slash" icon-child="i" title="${lang['Show Only Playing']}"><i class="fa fa-eye-slash"></i></a>
                                <a class="btn btn-sm btn-default" timeline-action="refresh" title="${lang.Refresh}"><i class="fa fa-refresh"></i></a>
                            </div>
                            <div class="btn-group">
                                <a class="btn btn-sm btn-primary" id="timeline-date-selector" title="${lang.Date}"><i class="fa fa-calendar"></i></a>
                            </div>
                            <div class="btn-group">
                                <button type="button" class="btn btn-primary btn-sm dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fa fa-video-camera"></i>
                                </button>
                                <ul class="dropdown-menu px-3 bg-dark" id="timeline-monitor-list"></ul>
                            </div>
                        </div>
                        `,
                    },
                    {
                        "fieldType": "div",
                        "id": "timeline-bottom-strip",
                    },
                    {
                        "fieldType": "div",
                        "id": "timeline-pre-buffers",
                        "class": "hidden",
                    }
               ]
           },
        }
    }
}
