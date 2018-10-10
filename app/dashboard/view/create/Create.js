import React, { Component } from 'react';

import './create.css';

import api from '../../api';
import i18n from '../../utils/i18n';
import Radio from '../../share/radio';
import ToolTip from '../../share/toolTip';
import Local from './local';
import Coding from './coding';
import Git from './git';
import { notify, NOTIFY_TYPE } from 'components/Notification/actions';

class Create extends Component {
    state = {
        canCreateWS: true,
        projects: [],
        templates: [],
        envs: [],
        importFrom: 'coding',
        isToolTipOn: false,
    };

    render() {
        const { canCreateWS, projects, templates, envs, importFrom, isToolTipOn } = this.state;
        return (
            <div className="dash-create">
                <div className="com-board">
                    <div className="board-label">{i18n('global.source')}*</div>
                    <div className="board-content radio">
                        <div className="radio-option radio-dev-platform" onClick={() => this.handleImportFrom('coding')}>
                            <span onMouseEnter={this.handleToolTip} onMouseLeave={this.handleToolTip}>
                                <Radio checked={importFrom === 'coding'} />
                                <span>{i18n('global.tencentCloudDevPlatform')}</span>
                            </span>
                            <ToolTip on={isToolTipOn} message={isToolTipOn ? i18n('ws.oldCoding') : ''} placement="center" />
                        </div>
                        <div className="radio-option" onClick={() => this.handleImportFrom('git')}>
                            <Radio checked={importFrom === 'git'} />
                            <span>{i18n('ws.otherGitRepo')}</span>
                        </div>
                        <div className="radio-option" onClick={() => this.handleImportFrom('local')}>
                            <Radio checked={importFrom === 'local'} />
                            <span>{i18n('ws.noRemoteRepo')}</span>
                        </div>
                    </div>
                </div>
                {importFrom === 'local' && <Local templates={templates} />}
                {importFrom === 'coding' && <Coding projects={projects} templates={templates} envs={envs} fetchCodingProject={this.fetchCodingProject} />}
                {importFrom === 'git' && <Git envs={envs} />}
            </div>
        );
    }

    componentDidMount() {
        this.fetchCodingProject();
        this.fetchTemplateProject();
        this.fetchEnvList();
    }

    handleToolTip = () => {
        this.setState(prevState => ({ isToolTipOn: !prevState.isToolTipOn }));
    }

    fetchCodingProject = () => {
        api.getCodingProject().then(res => {
            if (res.code === 0) {
                this.setState({ projects: res.data });
            } else if (res.code === 401) {
                window.top.postMessage({ path: '/intro' }, '*');
                window.location.href = '/intro';
            } else {
                notify({ notifyType: NOTIFY_TYPE.ERROR, message: res.msg });
            }
        }).catch(err => {
            notify({ notifyType: NOTIFY_TYPE.ERROR, message: err });
        });
    }

    fetchTemplateProject = () => {
        api.getTemplateProject().then(res => {
            if (res.code === 0) {
                this.setState({ templates: res.data });
            } else if (res.code === 401) {
                window.top.postMessage({ path: '/intro' }, '*');
                window.location.href = '/intro';
            } else {
                notify({ notifyType: NOTIFY_TYPE.ERROR, message: res.msg });
            }
        }).catch(err => {
            notify({ notifyType: NOTIFY_TYPE.ERROR, message: err });
        });
    }

    fetchEnvList = () => {
        api.getEnvList().then(res => {
            if (Array.isArray(res)) {
                this.setState({ envs: res });
            } else if (res.code === 401) {
                window.top.postMessage({ path: '/intro' }, '*');
                window.location.href = '/intro';
            } else {
                notify({ notifyType: NOTIFY_TYPE.ERROR, message: res.msg });
            }
        }).catch(err => {
            notify({ notifyType: NOTIFY_TYPE.ERROR, message: err });
        });
    }

    handleImportFrom = (source) => {
        this.setState({ importFrom: source });
    }
}

export default Create;