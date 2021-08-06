# Notes
#   * See file `.dockerignore` for files which is include to building context.
#   * Because limitation of instruction `COPY`, there is no way to optimize
#     cache layers without create too many intermediate images.

# Layer A
#   * Contain build tools to install and build dependency packages.
#   * If file `package.json` does not change then docker uses cache image.
FROM node:10-alpine as builder
WORKDIR /package
RUN apk add make g++ python3
COPY package.json package.json
RUN npm install --only production

# Layer B
#   * Contain all dependency packages to run this service.
#   * If above layer does not change then docker uses cache image.
FROM node:10-alpine as dependency_package_layer
WORKDIR /package
COPY --from=builder /package/node_modules node_modules

# Layer C
#   * Contain source code.
#   * If above layer and source code does not change then docker uses
#     cache image.
COPY . .
ENTRYPOINT ["node", "bin/www"]
