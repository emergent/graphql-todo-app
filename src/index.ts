import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchemaSync } from '@graphql-tools/load';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Context } from './types/context';
import resolvers from './resolvers';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import fetch from 'node-fetch';
import { APOLLO_SERVER_PORT, AUTH0_DOMAIN, AUTH0_AUDIENCE } from './config/constants';
import { z } from 'zod';

const Auth0UserInfoObject = z.object({
  nickname: z.string(),
  email: z.string()
});
type Auth0UserInfo = z.infer<typeof Auth0UserInfoObject>;


// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typeDefs = loadSchemaSync(join(__dirname, '../schema.graphql'), {
  loaders: [new GraphQLFileLoader()],
});

const myPlugin = {
  // Fires whenever a GraphQL request is received from a client.
  async requestDidStart(requestContext) {
    console.log('Request started! Query:\n' + requestContext.request.query);

    return {
      // Fires whenever Apollo Server will parse a GraphQL
      // request to create its associated document AST.
      async parsingDidStart(requestContext) {
        console.log('Parsing started!');
      },

      // Fires whenever Apollo Server will validate a
      // request's document AST against your GraphQL schema.
      async validationDidStart(requestContext) {
        console.log('Validation started!');
      },

      async didResolveOperation(requestContext) {
        console.log(`Resolve operation!: ${requestContext}`);
      },

      async executionDidStart(executionRequestContext) {
        return {
          willResolveField({ source, args, contextValue, info }) {
            const start = process.hrtime.bigint();
            return (error, result) => {
              const end = process.hrtime.bigint();
              console.log(`Field ${info.parentType.name}.${info.fieldName} took ${end - start}ns`);
              if (error) {
                console.log(`It failed with ${error}`);
              } else {
                console.log(`It returned ${result}`);
              }
            };
          },
        };
      },

      async didEncounterErrors(requestContext) {
        console.log(`Error: ${requestContext.errors}`)
      }
    };
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [myPlugin]
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
  listen: { port: parseInt(APOLLO_SERVER_PORT) },
  context: async ({ req, res }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === undefined) {
      return {
        user: undefined
      };
    }

    try {
      const user = await new Promise<JwtPayload>((resolve, reject) => {
        const client = jwksClient({
          jwksUri: `${AUTH0_DOMAIN}/.well-known/jwks.json`,
        });
        jwt.verify(
          token,
          (header, cb) => {
            client.getSigningKey(header.kid, (err, key) => {
              const signingKey = key?.getPublicKey();
              cb(null, signingKey);
            });
          },
          {
            audience: `${AUTH0_AUDIENCE}`,
            issuer: `${AUTH0_DOMAIN}/`,
            algorithms: ['RS256']
          },
          (err, decoded) => {
            if (err) {
              return reject(err);
            }
            if (decoded === undefined || typeof decoded === "string") {
              return reject('decoded is invalid.');
            }
            resolve(decoded);
          }
        );
      });

      const userInfo = await fetch(`${AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json());

      const ui: Auth0UserInfo = Auth0UserInfoObject.parse(userInfo);

      const context: Context = {
        user: {
          id: user.sub,
          name: ui.nickname,
          email: ui.email
        }
      } as Context;

      return context;

    } catch (error) {
      console.log(error)
      return {
        user: undefined
      }
    }
  }
});

console.log(`🚀  Server ready at: ${url}`);

