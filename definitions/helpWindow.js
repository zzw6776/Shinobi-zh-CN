module.exports = (s,config,lang,Theme) => {
    return {
           "section": "Help Window",
           "blocks": {
               "Column1": {
                   "name": lang["Helping Hand"],
                  "color": "navy",
                  "blockquote": lang.helpFinderDescription,
                  "section-pre-class": "col-md-4",
                  "info": [
                       {
                         "id": "helpinghand-options",
                         "field": lang["Active Tutorial"],
                         "fieldType": "select",
                         "possible": [
                             // {
                             //    "name": lang['Date Updated'],
                             //    "value": "dateUpdated"
                             // },
                         ]
                      },
                      {
                          "field": lang["Monitor"],
                          "form-group-class": "helping-hand-target-monitor",
                          "fieldType": "select",
                          "class": "monitors_list",
                     },
                     {
                         "fieldType": "btn",
                         "class": `btn-primary fill watch-helping-hand mb-1`,
                         "btnContent": lang.Run,
                     },
                     {
                         "id": "helpinghand-results",
                         "fieldType": "div",
                     },
                 ]
             },
             "Column2": {
                noHeader: true,
                "color": "blue",
                "section-pre-class": "col-md-8",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        title: lang["New to Shinobi?"],
                        info: `Try reading over some of these links to get yourself started.`,
                        buttons: [
                            {
                                icon: 'newspaper-o',
                                color: 'default',
                                text: lang.afterInstallationGuides,
                                href: 'https://shinobi.video/docs/configure'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnH264Camera,
                                href: 'https://shinobi.video/docs/configure#content-adding-an-h264h265-camera'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnMJPEGCamera,
                                href: 'https://shinobi.video/articles/2018-09-19-how-to-add-an-mjpeg-camera'
                            },
                            {
                                icon: 'gears',
                                color: 'default',
                                text: lang.rtspCameraOptimization,
                                href: 'https://shinobi.video/articles/2017-07-29-how-i-optimized-my-rtsp-camera'
                            },
                            {
                                icon: 'comments-o',
                                color: 'info',
                                text: lang.communityChat,
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                            {
                                icon: 'reddit',
                                color: 'info',
                                text: lang.forumOnReddit,
                                href: 'https://www.reddit.com/r/ShinobiCCTV'
                            },
                            {
                                icon: 'file-o',
                                color: 'primary',
                                text: lang.Documentation,
                                href: 'http://shinobi.video/docs'
                            }
                        ]
                    },
                    {
                        bigIcon: "smile-o",
                        title: lang.itsAProvenFact,
                        info: lang.generosityHappierPerson,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: lang['ShinobiShop Subscriptions'],
                                href: 'https://licenses.shinobi.video/subscribe'
                            },
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                            {
                                icon: 'bank',
                                color: 'default',
                                text: 'University of Zurich (UZH)',
                                href: 'https://www.zora.uzh.ch/id/eprint/139275/'
                            },
                        ]
                    },
                    {
                        title: lang["Shinobi Mobile"],
                        info: lang.yourSubscriptionText,
                        buttons: [
                            {
                                icon: 'star',
                                color: 'success',
                                text: lang['Get the Mobile App'],
                                href: 'https://shinobi.video/mobile'
                            },
                            {
                                icon: 'comments-o',
                                color: 'primary',
                                text: lang['#mobile-client Chat'],
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                        ]
                    },
                    {
                        title: lang.activateShinobi,
                        info: lang.howToActivate,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Shinobi Mobile License ($5/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G31AZ9mknNCa6z',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Tiny Support Subscription ($10/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G42jNgIqXaWmIC',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: '100 Camera License ($75/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G3LGdNwA8lSmQy',
                            },
                        ]
                    },
                    {
                        title: lang['Donations, One-Time Boost'],
                        info: lang.donationOneTimeText,
                        width: 12,
                        buttons: [
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                        ]
                    },
                ].map((block) => {
                    var parsedButtons = block.buttons.map((btn) => {
                        return {
                            "fieldType": "btn",
                            "class": `btn-${btn.color} fill mb-1`,
                            "icon": btn.icon,
                            "attribute": `href="${btn.href}" target="_blank"`,
                            "btnContent": btn.text,
                        }
                    });
                    return {
                       noHeader: true,
                       isFormGroupGroup: true,
                       "section-pre-class": `col-md-${block.width || '6'} mb-3`,
                       "info": [
                           {
                               "fieldType": "div",
                               divContent: `<h3>${block.title}</h3>`
                           },
                           {
                               "fieldType": "div",
                               class: 'mb-3',
                               divContent: block.info
                           },
                           ...parsedButtons
                       ]
                    }
                })
            },
        }
    }
}
