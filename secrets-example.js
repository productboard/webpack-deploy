var secrets = {
  redis: {
    staging: {
      auth_pass: ""
    },
    me: {
      auth_pass: ""
    },
    production: {
      auth_pass: ""
    }
  },
  s3: {
    accessKeyId:     '',
    secretAccessKey: '',
  },
  rollbar: {
    development: {
      accessToken: '',
    },
    staging: {
      accessToken: '',
    },
    production: {
      accessToken: '',
    },
  },
};

module.exports = secrets;
