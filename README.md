# node-kas

> A drop-in replacement for KAS.

## API

- RL: Requires Login (Cookies)
- RA: Rate limit
- RS: Requires Service (`Authorization: Bearer <token>` HTTP header)
- NC: CSRF Token needed (See [CSRF section](#csrf))

Request should be `application/x-www-form-urlencoded` and `application/json` and `Content-Type` header should be set.

Returns JSON if not otherwise stated:
- `{"status":0,"message":"成功","result":"some result"}` - `0` indicates OK
- `{"status":1,"message":"非法请求"}` - `1` indicates an invalid request
- `{"status":-1,"message":"TypeError: Cannot convert null or undefined to object"}` - `-1` indicates an unknown error
- `{"status":-2,"message":"您尚未登录"}` - `-2` indicates unauthorized

### `POST /api/avatar`
RL NC Multipart, Sets avatar    
Form fields:
- `_csrf`
- `avatar:file` avatar file

Returns: redirect to home page (302) if success; else message as plain text

### `PUT /api/email`
RL RA(1min), Sends verification email    
Form fields:
- `email:string` email address

### `PUT /api/keeer-id`
RL, Sets KEEER ID    
Form fields:
- `id:string` KEEER ID

### `PUT /api/nickname`
RL, Sets nickname    
Form fields:
- `nickname:string` Nickname

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

### `PUT /api/phone-number`
RL, Sets phone number    
Form fields:
- `number:string` Phone number
- `code:string` Verification code

### `PUT /api/sms-code`
RA(1min), Sends SMS.    
Form fields:
- `number:string` Phone number
- `type:enum` Send type

Types:
- `SMS_TYPE_REGISTER` Register
- `SMS_TYPE_FIND_BACK_PASSWORD` Find back password
- `SMS_TYPE_SET_PHONE_NUMBER` RL, Sets new phone number

### `GET /api/user-information`
RL, Gets user information    
Returns:
- `avatar:string?` Avatar URL
- `nickname:string?` Nickname
- `keeerId:string?` KEEER ID
- `kredit:int` Centi-kredit

### `GET /api/login-config?service=<service name>`
Gets login UI config for the designated service    
Returns: `{ title, logoSrc, backgroundUrl, themeColor, redirectUrl }`

### `GET /api/<login token>/kiuid`
RS, Gets KIUID of the token.    
Returns `:string` KIUID

### `GET /api/recharge-order?id=<order ID>[&watch=true]`
RL, Gets [ and watches ] a recharge order    
Returns `:boolean` true if completed    
Throws `{"status":127,"code":"ETIMEOUT"}`

### `PUT /api/recharge-order`
RL, Creates recharge order    
Form fields:
- `amount:number` Cents

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

Throws: 
- `{"status":3,"code":"EINVALID_AMOUNT"}` Invalid amount
- `{"status":4,"code":"EINSUFFICIENT_KREDIT"}` User has insufficient kredit

### `PUT /api/token[?set-cookie=true]`
Logs in (i.e. creates a token) [ and sets the token in response header ].    
Headers:
- `Authorization: basic <credentials>` where credentials is base64(identity ':' password)

### `DELETE /api/token/<token?>[?set-cookie=true]`
Log out (i.e. destroys the token in URL or cookies) [ and removes cookies ].

### `PUT /api/user[?set-cookie=true]`
Signs up (i.e. creates a new user) [ and sets token cookie in response header ]    
Form fields:
- `number:string` Phone number
- `code:string` Verification code
- `password:string` Password

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
