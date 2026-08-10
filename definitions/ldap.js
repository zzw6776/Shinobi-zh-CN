module.exports = (s,config,lang,Theme) => {
    return {
        "section": "LDAP",
        "blocks": {
            "LDAP": {
               "evaluation":"details.use_ldap!=='0'",
               "name": lang["LDAP"],
               "color": "forestgreen",
               "info": [
                   {
                      "name": "ldap_url",
                      "field": lang.URL,
                      "description": "",
                      "example": "ldap://127.0.0.1:389",
                      "possible": ""
                   },
                   {
                      "name": "username",
                      "field": lang.Username,
                      "description": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "password",
                      "field": lang.Password,
                      "description": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "ldap_bindDN",
                      "field": lang.bindDN,
                      "description": "",
                      "example": "cn=admin,dc=test,dc=com",
                      "possible": ""
                   },
                   {
                      "name": "ldap_searchBase",
                      "field": lang['Search Base'],
                      "description": "",
                      "example": "dc=test,dc=com",
                      "possible": ""
                   },
                   {
                      "name": "ldap_searchFilter",
                      "field": lang['Search Filter'],
                      "description": "",
                      "example": "uid={{username}}",
                      "possible": ""
                   },
                   {
                      "fieldType": "btn",
                      "forForm": true,
                      "attribute": `type="submit"`,
                      "class": `btn-success`,
                      "btnContent": `<i class="fa fa-check"></i> &nbsp; ${lang['Save']}`,
                   },
               ]
            }
        }
    }
}
