# serverless-build-modules

##### ___- Design your serverless in small readable files___

This cli package was created to turn able the modularization of your serverless files with high amount of configurations like functions and resoruces in small files, in other words, modularize your project structure to keep it legible. So, this cli can build all these modules in a single sls file to be deployed by serverless.

## # the problematic:

In the most cases when we are designing our service architecture in serverless, it got a lot of configurations that can easily grow up for each new function added to the serverless file, and at a certain point that files becomes unreadable.

Of course, we can make use of `serverless-compose` to breake our entire architecture in multiple services, but even so, more specific services can end up growing a lot depending on the amount of functions and associated resources at this context.

Then we introduce the `serverless-build-module`, that allows you to break theses service in modules, where your can define a single function and only the specific resources associated to this function, but that still belongs to the same service, keeping smaller and legible files. When you're done, this cli will merge all modules in a single sls file to be deployed by serverless.

---

## # getting started:

This CLI is designed to run in your CI/CD pipeline with simplicity in mind, with no changes to your existing architecture required.

With this in mind, you just need to:

1 - Install the library

```sh
npm install -g serverless-build-modules
```

2 - Run the cli command before run `serverless deploy`

```sh
$ serverless-build-modules --file serverless.yml
```

3 - **!!! IMPORTANT !!!** - To test library in development you __must__ to use the `--dev` flag, it will create a `serverless.build.yml` file to check if is everything ok instead of override your original serverless.yml file
```sh
$ serverless-build-modules --file serverless.yml --dev
```

> ##### When this command runs, it will merge all serverless.m.yml files into existent serverless.yml files, so keep in mind to just run this command on your CI/CD pipeline, otherelse it will override your original serverless files in development if you not provided the --dev flag.


---

## # how it works?

Firstly the lib will search for the `serverless.yml` file on directory, if not founded, then it will search for `serverless-compose.yml` file at the same directory, or if you have a file with a different name, you can provide the arg `--file your-sls-filename.yml`.

Once the main serverless file is founded, it will identify if is a single service, or a serverless-compose pointing to another directory services and create a map for these paths.

Then for each service path, the library will work in scopped builds, searching for subfolder files called `serverless.m.yml`, reading its content, resolving relative paths and merging the module on original serverless service file.

On the end, you will get build service files containing all module contents and ready to be deployed by serverless.


> ##### keep in mind that your serverless files can co-exists in the same folder structure and the serverless modules will only be merged to its directly parent.


---

## # can you help me with examples? yes!

Imagine you have a serverless file with 3 functions and for each function, attached resources needed to fire the function's trigger.

##### `complex-serverless.yml`
```yml
service: complex-service

provider:
  name: aws
  stage: ${opt:stage, 'development'}

functions:
  function-module-a:
    handler: modules/module-a/index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleAQueue.Arn
          batchSize: 1
  function-module-b:
    handler: modules/module-b/index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleBQueue.Arn
          batchSize: 1
  function-module-c:
    handler: modules/module-c/index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleCQueue.Arn
          batchSize: 1

resources:
  Resources:
    ModuleAQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-a-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleADeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleADeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-a-dlq
    ModuleBQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-b-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleBDeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleBDeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-b-dlq
    ModuleCQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-c-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleCDeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleCDeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-c-dlq
```

It is not hard to see that how much more implementations you have on the service, more complex and unreadable it becomes. Then with this library we can split it on modules to keep more simple and readable.

##### `src/serverless.yml`
```yml
service: simple-service

provider:
  name: aws
  stage: ${opt:stage, 'development'}
```

##### `src/modules/module-a/serverless.m.yml`
```yml
functions:
  function-module-a:
    handler: index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleAQueue.Arn
          batchSize: 1
resources:
  Resources:
    ModuleAQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-a-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleADeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleADeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-a-dlq
```

##### `src/modules/module-b/serverless.m.yml`
```yml
functions:
  function-module-b:
    handler: index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleAQueue.Arn
          batchSize: 1
resources:
  Resources:
    ModuleBQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-b-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleBDeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleBDeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-b-dlq
```

##### `src/modules/module-c/serverless.m.yml`
```yml
functions:
  function-module-c:
    handler: index.handler   
    events:
      - sqs:
          arn: !GetAtt ModuleCQueue.Arn
          batchSize: 1
resources:
  Resources:
    ModuleCQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: module-c-queue
        VisibilityTimeout: 360
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt ModuleCDeatLetterQueue.Arn
          maxReceiveCount: 10
    ModuleCDeatLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: module-c-dlq
```

For this scenario, the module becomes readable and maintainable, and on the build moment, after run `serverless-build-module` we got the same result as `complex-serverless.yml` ready to be deployed.

> On this project [example directory](https://github.com/andreciornavei/serverless-build-modules/tree/main/example), you can find a complex implementation scenario making use of `serverless-compose`, a shared resources service and another service with two separated modules.

---

## # the relative path resolver

Relative path resolver is used to adjust relative paths from module to its serverless.yml parent, it grants that built serverless.yml keep looking to the right file paths.

Example:
##### `src/modules/module_a/serverless.m.yml`
```yml
functions:
  module-fn-name:
    handler: index.handler   
```
Then after built, it will look like:
##### `src/serverless.yml`
```yml
functions:
  module-fn-name:
    handler: modules/module_a/index.handler   
```

For while, this library support resolver for the following relative paths:

```yml
- functions.*.handler # all function handle paths
- provider.ecr.images.*.path # docker ecr image path on provider
```

**!!! if you find and need to implement more relative path mappings, contact me via github repo.**