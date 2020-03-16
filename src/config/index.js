module.exports = {
    gitlabGroupMcfId: 222,  // mcf的ID
    verdaccioPackageDetail: 'http://192.168.200.178:4873/-/verdaccio/sidebar/{@packageName@}',
    privateToken: 'Hb5Qay-YrE-hsAQg_P8t', // gitlab token
    gitlab: 'http://git.mchz.com.cn/',
    gitlabApi: {
        groups: 'http://git.mchz.com.cn/api/v4/groups',
        projectsByGroupId: 'http://git.mchz.com.cn/api/v4/groups/{@groupId@}/projects',
        projectFileDetail: 'http://git.mchz.com.cn/api/v4/projects/{@projectId@}/repository/files/package.json?ref={@branchName@}',
        projectBranchs: 'http://git.mchz.com.cn/api/v4/projects/{@projectId@}/repository/branches'
    },
    REQUEST_METHOD: {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE'
    }
}