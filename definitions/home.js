module.exports = (s,config,lang,Theme) => {
    return {
        "section": "Home",
        "blocks": {
         "Container4": {
             "name": "Container4",
             "color": "grey",
             "noHeader": true,
             "noDefaultSectionClasses": true,
             "section-class": "col-lg-12",
             "info": [
                 {
                     ejs: 'web/pages/blocks/home/recentVideos',
                 },
             ]
         }
      }
   }
}
