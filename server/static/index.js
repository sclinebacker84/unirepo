const {h,Component,render} = window.preact
const ES = ''

class Header extends Component{
    constructor(props){
        super(props)
        this.state = {tabs:[Repos,Files]}
        props.tab = props.tab || this.state.tabs[0]
        this.props.refresh({tab:props.tab})
    }
    tab(e,tab){
        this.props.refresh({tab})
    }
    render(){
        return h('div',{class:'columns'},
            h('div',{class:'col-4 col-mx-auto text-center'},
                this.state.tabs.map(t => h('a',{class:`btn btn-link ${this.props.tab == t && 'text-bold'}`,onClick:e => this.tab(e,t)},t.name))
            )
        )
    }
}

class Repos extends Component {
    constructor(props){
        super(props)
        this.state = {repos:[]}
        this.initForm(props)
        this.repos()
    }
    initForm(props){
        props = props || this.props
        this.setState({form:{type:props.info.repos.types[0]}})
    }
    async repos(){
        const repos = await request('repo')
        this.setState({repos})
    }
    input(e,name){
        this.state.form[name] = e.target.value
        this.setState(this.state)
    }
    async submit(e){
        e.preventDefault()
        await request('repo',this.state.form)
        this.clear(e)
        await this.repos()
    }
    clear(e){
        e.preventDefault()
        this.initForm()
    }
    rebuild(r){
        r.loading = true
        this.setState(this.state)
        request(`rebuild/${r.name}`,undefined,'POST').then(info => {
            r.loading = false
            this.setState(this.state)
            alert(`rebuilt ${info.count} files`)
        })
    }
    render(){
        return h('div',{class:'container'},
            h('div',{class:'columns'},
                h('div',{class:'col-8 p-2'},
                    h('table',{class:'table table-striped'},
                        h('thead',undefined,
                            h('tr',undefined,
                                this.props.info.schema.repos.map(r => h('th',undefined,r.name)),
                                h('th',undefined,'backup')
                            )
                        ),
                        h('tbody',undefined,
                            this.state.repos.map(r => h('tr',undefined,
                                h('td',undefined,
                                    h('a',{href:'/browse/repos/'+r.name,target:'_blank'},r.name)
                                ),
                                h('td',undefined,
                                    h('a',{href:r.url,target:'_blank'},r.url)
                                ),
                                h('td',undefined,
                                    h('a',{href:`browse/repo_files/${r.type}.repo`,target:'_blank'},r.type)
                                ),
                                h('td',undefined,
                                    h('a',{class:'btn chip',href:`backup/full/${r.name}`,target:'_blank'},'Full'),
                                    h('a',{class:'btn chip',href:`backup/incremental/${r.name}`,target:'_blank'},'Incremental'),
                                    h('button',{class:'btn chip '+(r.loading ? 'loading' : ES),onClick:e => this.rebuild(r)},'Rebuild')
                                )
                            ))
                        )
                    )
                ),
                h('form',{class:'col-4 p-2',onSubmit:e => this.submit(e)},
                    h('div',{class:'form-group'},
                        h('label',{class:'form-label'},'name'),
                        h('input',{class:'form-input',onInput:e => this.input(e,'name'),value:this.state.form.name || ES})
                    ),
                    h('div',{class:'form-group'},
                        h('label',{class:'form-label'},'url'),
                        h('input',{class:'form-input',onInput:e => this.input(e,'url'),value:this.state.form.url || ES})
                    ),
                    h('div',{class:'form-group'},
                        h('label',{class:'form-label'},'type'),
                        h('select',{class:'form-select',onInput:e => this.input(e,'type'),value:this.state.form.type},
                            this.props.info.repos.types.map(r => h('option',{value:r},r))
                        )
                    ),
                    h('div',{class:'btn-group-blk text-center'},
                        h('button',{class:'btn'},'Save'),
                        h('a',{class:'btn',onClick:e => this.clear(e)},'Clear')
                    )
                )
            )
        )
    }
}

class Files extends Component {
    upload(e){
        const form = new FormData()
        for(const file of this.state.files){
            form.append('files',file,file.name)
        }
        this.setState({loading:true})
        upload('files',form,{'x-group':this.state.group}).then(text => {
            alert('done')
            this.setState({files:undefined,group:ES,loading:false})
        })
    }
    render(){
        return h('div',{class:'columns'},
            h('div',{class:'col-6 col-mx-auto'},
                h('div',{class:'text-center'},
                    h('a',{href:'/browse/files',target:'_blank'},'Browse'),
                ),
                h('div',{class:'form-group'},
                    h('label',{class:'form-label'},'Group'),
                    h('input',{class:'form-input',value:this.state.group,onInput:e => this.setState({group:e.target.value})})
                ),
                h('div',{class:'form-group'},
                    h('label',{class:'form-label'},'Files'),
                    h('input',{class:'form-input',type:'file',multiple:true,onInput:e => this.setState({files:Array.from(e.target.files)})})
                ),
                this.state.files && this.state.files.length && [
                    h('table',{class:'table table-striped'},
                        h('thead',undefined,
                            h('tr',undefined,
                                h('th',undefined,'Name'),
                                h('th',undefined,'Size')
                            )
                        ),
                        h('tbody',undefined,
                            this.state.files.map(f => h('tr',undefined,
                                h('td',undefined,f.name),
                                h('td',undefined,f.size)
                            ))
                        )
                    ),
                    h('div',{class:'btn-group-blk text-center mt-1'},
                        h('button',{class:`btn ${this.state.loading ? 'loading' : ''}`,onClick:e => this.upload(e),disabled:!this.state.group},'Upload')
                    )
                ]
            )
        )
    }
}

class Container extends Component{
    constructor(props){
        super(props)
        this.state = {}
        request('info').then(info => this.setState({info}))
    }
    render(){
        const payload = {
            refresh:state => this.setState(state || this.state),
            tab:this.state.tab,
            info:this.state.info
        }
        return [
            h(Header,payload),
            this.state.tab && this.state.info && h('div',undefined,
                h(this.state.tab,payload)
            )
        ]
    }
}

render(h(Container,{}), document.body)