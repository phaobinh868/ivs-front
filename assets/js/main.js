class ComponentService {
    constructor() {
    }

    async fetch(page) {
        const response = await fetch("components/" + page + ".html");
        return response.text();
    }

    parseTemplate(template, data){
        return template.replace(/\${(\w+)}/g, ($0, $1) => {
            return data[$1];
        });
    }
}

class UIService {
    constructor(page) {
        this.page = page;
    }
    addListeners(){
        const elements = document.querySelectorAll("[data-redirect-to]");
        elements.forEach(element => {
            element.addEventListener('click', () => {
                this.page.goToPage(element.getAttribute("data-redirect-to"));
            })
        })
    }
}

class ApiService {
    
    apiHost = environment.production?environment.apiProd:environment.apiDev
    
    apis = {
        login: "/auth/login",
        register: "/auth/register",
        users: "/users",
        user: "/users",
        edit: "/users"
    }

    constructor(page) {
        this.page = page;
    }

    makeRequest(method, url, params) {
        this.page.loaderService.show();
        return new Promise((resolve, reject) => {
            let http = new XMLHttpRequest();
            http.open(method, url);
            if(params) http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            if(this.page.userService.token) http.setRequestHeader('Authorization', 'Bearer ' + this.page.userService.token);
            http.onload = () => {
                if (http.readyState === 4 && http.status == 200) {
                    const response = JSON.parse(http.responseText);
                    if(response.status === 0) {
                        this.page.loaderService.hide();
                        resolve(response.data);
                    } else {
                        this.page.loaderService.hide();
                        this.page.notifyService.show('error', response.status);
                        if(response.status == "ERR_INVALID_TOKEN" || response.status == "ERR_INVALID_BEARER") this.page.userService.logout();
                        reject();
                    }
                } else {
                    this.page.loaderService.hide();
                    this.page.notifyService.show('error', 'Error!');
                    reject();
                }
            };
            http.onerror = (error) => {
                this.page.loaderService.hide();
                this.page.notifyService.show('error', 'Error!');
                reject();
            };
            http.send(params);
        });
    }

    async makeGetRequest(url, params = ""){
        return await this.makeRequest("GET", this.apiHost + this.apis[url] + params);
    }
    async makePostRequest(url, data = {}, params = ""){
        return await this.makeRequest("POST", this.apiHost + this.apis[url] + params, data);
    }
}

class LoaderService {
    elementId = "loader";
    constructor(page) {
        this.page = page;
        this.initial();
    }
    initial(){
        this.node = document.createElement("div");
        this.node.setAttribute('id', this.elementId);
        document.getElementsByTagName("body")[0].appendChild(this.node);
    }
    show(){
        this.node.classList.add('show');
    }
    hide(){
        this.node.classList.remove('show');
    }
}

class NotifyService {
    statuses = {
        ERR_EXCEPTION: "Error! Please try again.",
        ERR_INVALID_DATA_INPUT: "Please fill data.",
        ERR_INVALID_TOKEN: "Invalid token.",
        ERR_INVALID_BEARER: "Invalid token.",
        ERR_USER_NOT_EXIST: "User doesn't exist",
        LOGIN_FAIL: "Email or password doesn't match",
        EMAIL_EXISTED: "Email is duplicated",
        USER_NOT_FOUND: "User doesn't found"
    }
    elementId = "snackbar";
    constructor(page) {
        this.page = page;
        this.initial();
    }
    initial(){
        this.node = document.createElement("div");
        this.node.setAttribute('id', this.elementId);
        document.getElementsByTagName("body")[0].appendChild(this.node);
    }
    show(status, msg){
        this.node.classList.add('show');
        this.node.classList.add(status);
        this.node.innerHTML = this.statuses[msg]??msg;
        setTimeout(() => { 
            this.node.classList.remove('show');
            this.node.classList.remove(status);
        }, 3000);
    }
}

class ValidateService {
    constructor(page) {
        this.page = page;
    }
    validate(rules, values){
        var valid = true
        Object.keys(rules).forEach(name => {
            const splitRules = rules[name].split("|");
            for(let i=0;i<splitRules.length; i++){
                if(splitRules[i] == 'required' && (values[name] === undefined || values[name].trim() == "")){
                    this.page.notifyService.show("error", name + " is required");
                    valid = false;
                    return;
                } else if(splitRules[i] == 'email' && (values[name] === undefined || values[name].trim() == "" || !this.validateEmail(values[name].trim()))){
                    this.page.notifyService.show("error", name + " is not a valid email");
                    valid = false;
                    return;
                }
            }
        })
        return valid;
    }
    validateEmail(mail) {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) return true;
        return false;
    }
}

class RouteService {

    pages = {
        login: "login",
        register: "register",
        users: "users"
    }

    constructor(page) {
        this.page = page;
        this.bodyELement = document.getElementsByTagName('body')[0];
    }

    async renderRoute(page) {
        const html = await this.page.componentService.fetch(this.pages[page]);
        document.getElementById(this.page.rootElement)['innerHTML'] = html;
        this.animate();
    }

    animate(){
        var from = "";
        var to = "2";
        if(this.bodyELement.classList.contains('animate-from-left-to-right2')){
            from = "2";
            to = "";
        }
        this.bodyELement.style.backgroundColor = getComputedStyle(document.getElementById(this.page.rootElement)).backgroundColor;
        this.bodyELement.classList.remove('animate-from-left-to-right' + from);
        this.bodyELement.classList.add('animate-from-left-to-right' + to);
    }
}

class UserService {
    constructor(page) {
        this.page = page;
        this.user = undefined;
        this.token = undefined;
        this.getFromLocalStorage();
    }

    getFromLocalStorage() {
        this.token = localStorage.getItem('token');
        this.user = localStorage.getItem('user');
        if(this.user) this.user = JSON.parse(this.user);
    }
    setUserData(data){
        if(data.token) {
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            this.token = undefined;
            this.user = undefined;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
    logout(){
        this.page.userService.setUserData({});
        this.page.goToPage("login");
    }
}

class BaseComponent {
    constructor(page) {
        this.page = page;
    }
    async render(){
        this.addListeners();
        this.page.uiService.addListeners();
        await this.afterRender();
    }
    async afterRender() {}
    addListeners(){}
}

class LoginComponent extends BaseComponent{

    pageName = 'login';

    constructor(page) {
        super(page);
    }

    addListeners(){
        const form = document.getElementById("login-form");
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const value = Object.fromEntries(data.entries());
            if(this.page.validateService.validate({
                "email": "required|email",
                "password": "required"
            }, value)){
                const response = await this.page.apiService.makePostRequest('login', new URLSearchParams(value).toString());
                this.page.notifyService.show("success", "Login success");
                this.page.userService.setUserData(response);
                this.page.goToPage('users');
            }
        });
    }
}

class RegisterComponent extends BaseComponent{

    pageName = 'register';

    constructor(page) {
        super(page);
    }

    addListeners(){
        const form = document.getElementById("register-form");
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const value = Object.fromEntries(data.entries());
            if(this.page.validateService.validate({
                "name": "required",
                "email": "required|email",
                "password": "required"
            }, value)){
                await this.page.apiService.makePostRequest('register', new URLSearchParams(value).toString());
                this.page.notifyService.show("success", "Register success");
                this.page.goToPage('login');
            }
        });
    }
}

class UsersComponent extends BaseComponent{

    pageName = 'users';

    queryParams = {
        page: 1,
        limit: 5
    };

    usersListElement = "user-list";
    usersDetailElement = "user-detail";

    constructor(page) {
        super(page);
    }

    async afterRender() {
        await this.initial();
        await this.getData();
    }

    async initial(){
        if(!this.page.userService.token) await this.page.goToPage('login');
        this.userListElement = await this.page.componentService.fetch("partials/user-list");
        this.userElement = await this.page.componentService.fetch("partials/user");
        this.pagingElement = await this.page.componentService.fetch("partials/paging");
        this.pageNumberElement = await this.page.componentService.fetch("partials/page-number");
        this.userDetailElement = await this.page.componentService.fetch("partials/user-detail");
    }

    async getData(){
        const response = await this.page.apiService.makeGetRequest('users', "?" + new URLSearchParams(this.queryParams).toString());
        let userString = "";
        response.users.forEach(user => {
            userString += this.page.componentService.parseTemplate(this.userElement, user);
        })
        const totalPage = Math.ceil(response.total/this.queryParams.limit);
        let pagingString = "";
        for(let i=1; i<= totalPage; i++){
            pagingString += this.page.componentService.parseTemplate(this.pageNumberElement, {num: i, class: (i == this.queryParams.page?"active": "")});
        }
        pagingString = this.page.componentService.parseTemplate(this.pagingElement, {pages: pagingString});
        document.getElementById(this.usersListElement)['innerHTML'] = this.page.componentService.parseTemplate(this.userListElement, {users: userString, paging: pagingString});
        this.addUsersListeners();
    }

    addUsersListeners(){
        const pagingBtns = document.querySelectorAll("#" + this.usersListElement + ' .paging-btn');
        pagingBtns.forEach(pagingBtn => {
            pagingBtn.addEventListener('click', (e) => {
                this.queryParams.page = parseInt(pagingBtn.getAttribute("data-number"));
                this.getData();
            });
        })
        const editBtns = document.querySelectorAll("#" + this.usersListElement + ' .edit-btn');
        editBtns.forEach(editBtn => {
            editBtn.addEventListener('click', async (e) => {
                await this.renderUserDetail(editBtn.getAttribute("data-id"));
            });
        })
    }

    async renderUserDetail(id){
        var user = {
            _id: "",
            name: "",
            email: "",
            password: ""
        };
        if(id){
            const response = await this.page.apiService.makeGetRequest('user', "/" + id);
            user = response.user;
        }
        document.getElementById(this.usersDetailElement)['innerHTML'] = this.page.componentService.parseTemplate(this.userDetailElement, user);
        this.addUserDetailListener();
    }

    addUserDetailListener(){
        const form = document.getElementById("user-form");
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const value = Object.fromEntries(data.entries());
            var id = undefined;
            const validate = {
                "name": "required",
                "email": "required|email"
            };
            if(!value['id'].trim()){
                validate['password'] = "required";
            } else {
                id = value['id'].trim();
            }
            if(this.page.validateService.validate(validate, value)){
                const response = await this.page.apiService.makePostRequest('edit', new URLSearchParams(value).toString(), id?("/" + id): "");
                this.page.notifyService.show("success", id?"Edit user success":"Add new user success");
                await this.renderUserDetail(response.user._id);
                await this.getData();
            }
        });
    }

    addListeners(){
        const logoutBtn = document.querySelector('[data-redirect-to="login"]');
        logoutBtn.addEventListener('click', (e) => {
            this.page.userService.setUserData({});
            this.page.notifyService.show("success", "Logout success");
        });
        const addNewBtn = document.querySelector('.add-btn');
        addNewBtn.addEventListener('click', async (e) => {
            await this.renderUserDetail(undefined);
        });
    }
}

class Page {
    currentPage;
    constructor(rootElement) {
        this.rootElement = rootElement;
        this.appVersionService = new AppVersionService(this);
        this.componentService = new ComponentService(this);
        this.validateService = new ValidateService(this);
        this.userService = new UserService(this);
        this.routeService = new RouteService(this);
        this.uiService = new UIService(this);
        this.apiService = new ApiService(this);
        this.loaderService = new LoaderService(this);
        this.notifyService = new NotifyService(this);
        this.loginComponent = new LoginComponent(this);
        this.registerComponent = new RegisterComponent(this);
        this.usersComponent = new UsersComponent(this);
        this.initial();
    }
    async initial() {
        const node = document.createElement("div");
        node.setAttribute('id', this.rootElement);
        document.getElementsByTagName("body")[0].appendChild(node);

        if(this.userService.token) return await this.goToPage('users');
        return await this.goToPage('login');
    }
    reloadCurrentPage(){
        this.currentPage.render();
    }
    async goToPage(page){
        await Object.keys(this).forEach(async component => {
            if(component != 'currentPage' && this[component].pageName && this[component].pageName == page) {
                this.currentPage = this[component];
                await this.routeService.renderRoute(page);
                await this.currentPage.render();
                return;
            }
        })
    }
}
document['addEventListener']('DOMContentLoaded', () => {
    'use strict';
    const isPWA = true;
    const scope = "/";
    const serviceWorkerJs = document.location.origin+'/_service-worker.js';
    function init() {
        new Page("main");
        if (isPWA === true) {
            if ('serviceWorker' in navigator) {
                window['addEventListener']('load', function () {
                    navigator['serviceWorker']['register'](serviceWorkerJs, {
                        scope: scope
                    })['then'](function (sw) {
                        sw['update']()
                    })
                })
            };
        };
    }
    init()
}) 