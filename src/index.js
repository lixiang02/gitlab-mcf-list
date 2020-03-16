const fs = require('fs')
const path = require('path')
const { flatten } = require('lodash')
const config = require('./config')
const rp = require('./lib/request')

class Container {
    constructor() {
        this.fileCatchPath = path.join(__dirname, '../catch_file.json')
        this.branchVersionMap = new Map()
        this.catchMap = new Map()
        this.catchKey = 'CATCH_DATA'
    }
    async getList(ctx) {

        // 获取缓存数据
        try {
            if (this.existCatchParams(ctx) && this.existCatchData()) {
                // 异步获取数据
                this.getRealData().catch(err => console.error(err))
    
                // 返回缓存数据
                return this.getCatchData()
            }
    
            // 直接获取真实数据
            return await this.getRealData()
        } catch (error) {
            console.error(error)
            throw new Error(error)
        }
    }

    // 获取真实数据
    async getRealData() {
        this.branchVersionMap.clear()
    
        // 请求组信息 
        const groups = await rp({ url: config.gitlabApi.groups })
    
        // 获取项目数据
        let result = null
        try {
    
            result = flatten(
                await Promise.all(this.getGroupIds(groups)
                    .map(groupId => this.fetchProjectsByGroups(groupId))))
    
            // 设置内存缓存
            this.setMemeryCatchData(result)
    
            // 设置文件缓存
            this.writeFileCatchData(result)
    
        } catch (error) {
            console.error('Fetch Projects Error')
        } finally {
            console.log('finally ~')
    
            // 清理分支版本数据
            this.branchVersionMap.clear()
    
            // 返回结果
            return result
        }
    }
    
    // catch
    existCatchParams(ctx) {
        if (ctx && ctx.params && ctx.params.catch && ctx.params.catch !== 'false') {
            return true
        }
        return false
    }
    
    existCatchData() {
        // 内存缓存
        if (this.existMemoryCatchData()) { return true }
    
        // 文件缓存
        return this.existCatchFileData()
    }
    
    getCatchData() {
        // 获取缓存数据
        if (this.existMemoryCatchData()) {
            return this.getMemeryCatchData()
        }
    
        // 获取文件数据
        if (this.existCatchFileData()) {
            return this.readCatchFileData()
        }
        
        return null
    }
    
    existCatchFileData() {
        const data = this.readCatchFileData()
        return data && data.length ? true : false
    }
    
    readCatchFileData() {
        const file = fs.readFileSync(this.fileCatchPath, 'utf8')
        return file ? JSON.parse(file) : null
    }
    
    writeFileCatchData(result) {
        fs.writeFileSync(this.fileCatchPath, JSON.stringify(result, 0, 2), 'utf8')
    }
    
    existMemoryCatchData() {
        return !!this.catchMap.size
    }
    
    getMemeryCatchData() {
        return this.catchMap.get(this.catchKey)
    }
    
    setMemeryCatchData(result) {
        this.catchMap.set(this.catchKey, result)
    }
    
    // api
    getGroupIds(groups=[]) {
        return groups
                .filter(e => e.parent_id === config.gitlabGroupMcfId)
                .map(e => e.id)
                .concat(config.gitlabGroupMcfId)
    }
    
    async getProjectData({ project, branchData }) {
    
        // 获取package.json文件信息
        let packageData = await this.fetchPackageData({projectId: project.id, branchName: branchData.name })
        packageData = packageData ? this.parseBase64ToString(packageData.content) : ''
        branchData.packageName = this.parseStringToObject(packageData).name
    
        if (branchData.packageName) {
            // 获取最新版本
            branchData.lastestVersion = await this.fetchLastVersion({ packageName: branchData.packageName })                
        }
    
        // 整合数据
        return {
            id: project.id,
            name: project.name,
            groupName: this.formatGroupName(project.path_with_namespace, project.name),
            branch: branchData.name,
            lastestVersion: this.formatLastestVersion(branchData.lastestVersion, branchData.packageName),
            coverage: this.getCoverageUrl(project.path_with_namespace, branchData.name),
            pipeline: this.getPipeline(project.path_with_namespace, branchData.name)
        }
    }
    
    async fetchLastVersion({ packageName }) {
        // 　获取每个分支项目的最新版本
        let lastestVersion = this.branchVersionMap.get(packageName)
        if (!lastestVersion) {
            try {
    
                let versionData = await rp({
                    url: this.formatUrl(config.verdaccioPackageDetail, { packageName })
                })
                lastestVersion = versionData && versionData.latest ? versionData.latest.version: ''
                this.branchVersionMap.set(packageName, lastestVersion)
    
            } catch (error) {
                console.log(`Package Name is ${packageName} Get LastestVersion is Error ${error}`)
            }
        }
        return lastestVersion
    }
    
    async fetchPackageData({ projectId, branchName }) {
        // 每个分支去拿package.json文件中的name
        return await rp({ 
            url: this.formatUrl(config.gitlabApi.projectFileDetail, { projectId, branchName })
        })
    }
    
    async fetchProjectBranch(project) {
        try {
            const branchDatas =  await rp({
                url: this.formatUrl(config.gitlabApi.projectBranchs, { projectId: project.id })
            })
            return await Promise.all((branchDatas || [])
                .map(branchData => this.getProjectData({ project, branchData })))
    
        } catch (error) {
            console.error('Fetch Project Branch Error', error.message)
            throw new Error(error)
        }
    }
    
    async  fetchProjectsByGroups(groupId) {
        try {
    
            const projects = await rp({
                url: this.formatUrl(config.gitlabApi.projectsByGroupId, { groupId })
            })
            
            return flatten(await Promise.all((projects || [])
                .map(project => this.fetchProjectBranch(project))))
    
        } catch (error) {
            console.error(`group projects data fetch failed: projectId: ${groupId}, error: `, error.message)
        }
    }
    
    // utils
    getPipeline(projectName, branchName) {
        return `${config.gitlab}${projectName}/badges/${branchName}/pipeline.svg`
    }
    
    getCoverageUrl(projectName, branchName) {
        return  `${config.gitlab}${projectName}/badges/${branchName}/coverage.svg`
    }
    
    formatGroupName(name, removeName) {
        return name.replace(removeName, '').replace(/\/$/, '')
    }
    
    formatLastestVersion(version, packageName) {
        return version ? `${packageName}@${version}` : '-'
    }
    
    parseBase64ToString(content) {
        return Buffer.from(content, 'base64').toString('utf8')
    }
    
    parseStringToObject(params) {
        if (params && typeof params === 'string') {
            try {
                return JSON.parse(params)
            } catch (error) {
                console.error('parse string fail', params)
            }
        }
        return {}
    }
    
    formatUrl(url, options={}) {
        let result = url
        for (const key in options) {
            result = result.replace(`{@${key}@}`, options[key])
        }
        return result
    }    
}


module.exports = new Container()
