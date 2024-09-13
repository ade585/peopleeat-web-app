import { ApolloClient, ApolloLink, InMemoryCache, split, type NormalizedCacheObject } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';

import { createUploadLink } from 'apollo-upload-client';
import { createClient } from 'graphql-ws';

export function createComplexApolloClient(httpUri: string, wsUri: string): ApolloClient<NormalizedCacheObject> {
    const httpLink = createUploadLink({ uri: httpUri, headers: { 'Apollo-Require-Preflight': 'true' }, credentials: 'include' });

    const isBrowser = typeof window !== 'undefined';

    console.log('>>>>> ' + httpUri);
    console.log('>>>>> ' + wsUri);
    console.log('>>>>> ' + isBrowser);
    console.log('>>>>> ' + typeof window);
    console.log('>>>>> ' + wsUri);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const errorLink = onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors) console.log('graphQLErrors', graphQLErrors);

        if (networkError) console.log('networkError', networkError);
    });

    if (!isBrowser) {
        return new ApolloClient({
            cache: new InMemoryCache(),
            defaultOptions: {
                watchQuery: {
                    fetchPolicy: 'no-cache',
                    errorPolicy: 'ignore',
                },
                query: {
                    fetchPolicy: 'no-cache',
                    errorPolicy: 'all',
                },
            },
            link: ApolloLink.from([errorLink, httpLink]),
        });
    }

    // ADE

    // Create the WebSocket client
    const wsLink = new GraphQLWsLink(
        createClient({
            url: wsUri,
            on: {
                // Handle reconnection attempts
                connected: () => console.log('WebSocket connected'),
                closed: (event) => {
                    console.log('WebSocket closed:>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', event);
                    // You can implement auto-reconnect logic here if necessary
                },
                error: (err) => console.error('WebSocket error:', err),
            },
        }),
    );

    // ADE

    // const wsLink = new GraphQLWsLink(createClient({ url: wsUri }));

    console.log('>>>>> END 1');

    const splitLink = split(
        ({ query }) => {
            const definition = getMainDefinition(query);
            return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
        },
        wsLink,
        httpLink,
    );

    console.log('>>>>> END 1');

    return new ApolloClient({
        cache: new InMemoryCache(),
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'no-cache',
                errorPolicy: 'ignore',
            },
            query: {
                fetchPolicy: 'no-cache',
                errorPolicy: 'all',
            },
        },
        link: splitLink,
    });
}

export function createApolloClient(cookieString?: string): ApolloClient<NormalizedCacheObject> {
    console.log('>>>>> createApolloClient 1');
    return new ApolloClient({
        uri: process.env.NEXT_PUBLIC_SERVER_URL,
        credentials: 'include',
        headers: { cookie: cookieString as string },
        cache: new InMemoryCache(),
        ssrMode: false,
    });
}
