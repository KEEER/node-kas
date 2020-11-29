# node-kas

> A drop-in replacement for KAS.

## Services
To add a service, use `node scripts/add-service` which is an interactive CLI.
To remove a service, use `DELETE FROM <table prefix>services WHERE name = '<service name>';` .
To modify a service, use `UPDATE <table prefix>services SET <key> TO <value> WHERE name = '<service name>'` .
See `sql/init.sql` for the database structure.

## API

> This documentation is generated partially by using the command: `node scripts/doc-responses`.

### Terminology

- RL: Requires Login (Cookies)
- RA: Rate limit
- RS: Requires Service (`Authorization: Bearer <token>` HTTP header)
- NC: CSRF Token needed (See the [CSRF section](#csrf))

### General rules

Request should be `application/x-www-form-urlencoded` or `application/json` and `Content-Type` header should be set.

Returns JSON if not otherwise stated:
- `{"status":0,"message":"成功","result":"some result"}` - `0` indicates OK
- `{"status":1,"message":"非法请求","code":"EINVALID_REQUEST"}` - `1` indicates an invalid request
- `{"status":-1,"message":"TypeError: Cannot convert null or undefined to object","code":"EUNKNOWN"}` - `-1` indicates an unknown error
- `{"status":-2,"message":"您尚未登录","code":"EUNAUTHORIZED"}` - `-2` indicates unauthorized

Please use the `code` to identify exceptions when possible, as status codes (except `0`) are non-informational and may subject to change.

### `GET /api/status`
Gets the status of the service.

#### Responses
- `{ status: 0 }`

### `POST /api/avatar`
RL NC Multipart, Sets avatar    
Form fields:
- `_csrf`
- `frontend` = `true` if is a frontend request (see below); else do not present this field (or leave blank)
- `avatar:file` avatar file

Returns: 
- Frontend request: redirect to home page (302) if success; else message as plain text
- Else: see below.

#### Responses
- `{ status: 0 }`
- `{ status: 2, message: 'Not an image', code: 'ENOT_IMAGE' }`
- `{ status: 3, message: 'Image too large', code: 'ETOO_LARGE' }`

### `PUT /api/email`
RL RA(1min), Sends verification email    
Form fields:
- `email:string` email address

#### Responses
- `{ status: 0, message: '验证码已发送，请查收。' }`
- `{ status: 2, message: '这个地址已经被其他帐号绑定。', code: 'ETAKEN' }`
- `{ status: 3, message: '操作过于频繁，请过一分钟后再试', code: 'EABUSE' }`
- `{ status: 4, message: '邮件地址不正确', code: 'EINVALID_ADDRESS' }`
- `{ status: 5, message: '暂时无法发送邮件', code: 'ESEND' }`

### `PUT /api/keeer-id`
RL, Sets KEEER ID    
Form fields:
- `id:string` KEEER ID

#### Responses
- `{ status: 0, message: '成功设置 KEEER ID' }`
- `{ status: 3, message: 'KEEER ID 包含非法字符', code: 'EINVALID_ID' }`
- `{ status: 4, message: '这个 KEEER ID 已被占用', code: 'EDUPLICATE' }`

### `PUT /api/nickname`
RL, Sets nickname    
Form fields:
- `nickname:string` Nickname

#### Responses
- `{ status: 0, message: '成功修改昵称' }`
- `{ status: 2, message: '昵称过长', code: 'ETOO_LONG' }`

### `PUT /api/password`
Sets or finds back password

#### Set password:
RL, Form fields:
- `current:string` Current password
- `password:string` New password

#### Find back password:
Form fields:
- `number:string` Phone number
- `code:string` Verification code
- `password:string` New password

#### Responses
- `{ status: 0, message: '成功重置密码' }`
- `{ status: 0, message: '成功修改密码' }`
- `{ status: 2, message: '密码不符合要求', code: 'EINVALID_PASSWORD' }`
- `{ status: 3, message: '验证码错误', code: 'EBAD_TOKEN' }`
- `{ status: 4, message: '手机号不正确', code: 'EINVALID_PHONE_NUMBER' }`
- `{ status: 5, message: '密码错误', code: 'EBAD_PASSWORD' }`

### `PUT /api/phone-number`
RL, Sets phone number    
Form fields:
- `number:string` Phone number
- `code:string` Verification code

#### Responses
- `{ status: 0, message: '成功设置手机号' }`
- `{ status: 2, message: '密码错误', code: 'EBAD_PASSWORD' }`
- `{ status: 3, message: '验证码不正确', code: 'EBAD_TOKEN' }`
- `{ status: 4, message: '手机号不正确', code: 'EINVALID_PHONE_NUMBER' }`

### `PUT /api/sms-code`
RA(1min), Sends SMS.    
Form fields:
- `number:string` Phone number
- `type:enum` Send type

Types:
- `SMS_TYPE_REGISTER` Register
- `SMS_TYPE_FIND_BACK_PASSWORD` Find back password
- `SMS_TYPE_SET_PHONE_NUMBER` RL, Sets new phone number

#### Responses
- `{ status: 0, message: '验证码已发送，请查收。' }`
- `{ status: 2, message: '您已经注册。', code: 'EDUPLICATE' }`
- `{ status: 2, message: '您尚未注册。', code: 'ENOTFOUND' }`
- `{ status: 3, message: '操作过于频繁，请过一分钟后再试', code: 'EABUSE' }`
- `{ status: 4, message: '手机号不正确', code: 'EINVALID_PHONE_NUMBER' }`
- `{ status: 5, message: '暂时无法发送短信', code: 'ESEND' }`

### `GET /api/user-information`
RL, Gets user information    
Returns:
- `avatar:string?` Avatar URL
- `nickname:string?` Nickname
- `keeerId:string?` KEEER ID
- `kredit:int` Centi-kredit

#### Responses
- `{ status: 0, result: { avatar, nickname, keeerId, kredit } }`

### `GET /api/login-config?service=<service name>`
Gets login UI config for the designated service    
Returns: `{ title, logoSrc, backgroundUrl, themeColor, redirectUrl, backgroundCopyright, backgroundCopyrightUrl }`

#### Responses
- `{ status: 0, result: cfg }`
- `{ status: 0, result: false }`: indicates no configuration in the service

### `GET /api/<login token>/kiuid`
RS, Gets KIUID of the token.    
Returns `:string` KIUID

#### Responses
- `{ status: 0, result: user.options.kiuid }`
- `{ status: 2, message: '这个帐号不存在。', code: 'ENOTFOUND' }`

### `GET /api/recharge-order?id=<order ID>[&watch=true]`
RL, Gets [ and watches ] a recharge order    
Returns `:boolean` true if completed

#### Responses
- `{ status: 0, result: state }`
- `{ status: 0, result: await createLongPoll(id) }`
- `{ status: 2, message: '订单不存在', code: 'ENOTFOUND' }`
- `{ status: 127, message: '超时', code: 'ETIMEOUT' }`

### `PUT /api/recharge-order`
RL, Creates recharge order    
Form fields:
- `amount:number` Cents

#### Responses
- `{ status: 0, result: '/recharge-cashier?' + search }`

### `POST /api/pay`
RS, Makes payment    
Form fields:
- `type:enum` Identity type, see below
- `identity:string` Identity
- `amount:number` Cents

Identity types:
- `phone-number` or `phoneNumber`
- `email`
- `keeer-id` or `keeerId`
- `kiuid`

#### Responses
- `{ status: 0 }`
- `{ status: 2, message: '找不到帐号', code: 'ENOTFOUND' }`
- `{ status: 3, message: String(e), code: 'EINVALID_AMOUNT' }` Invalid amount
- `{ status: 4, message: '余额不足', code: 'EINSUFFICIENT_KREDIT' }` User has insufficient kredit

### `PUT /api/token[?set-cookie=true]`
Logs in (i.e. creates a token) [ and sets the token in response header ].    
Headers:
- `Authorization: basic <credentials>` where credentials is base64(identity ':' password)

#### Responses
- `{ status: 0, message: '登录成功', result: token }`
- `{ status: 2, message: '用户名或密码错误', code: 'EBAD_CREDENTIALS' }`

### `DELETE /api/token/<token?>[?set-cookie=true]`
Log out (i.e. destroys the token in URL or cookies) [ and removes cookies ].

#### Responses
- `{ status: 0, message: '退出登录成功' }`
- `{ status: 2, message: '已失效的登录', code: 'ENOTFOUND' }`

### `PUT /api/user[?set-cookie=true]`
Signs up (i.e. creates a new user) [ and sets token cookie in response header ]    
Form fields:
- `number:string` Phone number
- `code:string` Verification code
- `password:string` Password

#### Responses
- `{ status: 0, message: '您已经成功注册！', result: token }`
- `{ status: 2, message: '密码不符合要求', code: 'EINVALID_PASSWORD' }`
- `{ status: 3, message: '验证码错误', code: 'EBAD_TOKEN' }`
- `{ status: 4, message: '手机号不正确', code: 'EINVALID_PHONE_NUMBER' }`
- `{ status: 5, message: '您已经注册，请直接登录或找回密码', code: 'EDUPLICATE' }`

## CSRF
Set a cookie named `_csrf` with a random value, and submit this random value in a form field called `_csrf`.

## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).
