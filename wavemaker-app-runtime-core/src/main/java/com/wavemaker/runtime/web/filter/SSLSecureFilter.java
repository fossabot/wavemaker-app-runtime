/**
 * Copyright © 2013 - 2017 WaveMaker, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.wavemaker.runtime.web.filter;

import java.io.IOException;
import java.net.URL;
import java.util.List;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.filter.GenericFilterBean;

import com.wavemaker.commons.model.security.SSLConfig;
import com.wavemaker.commons.pattern.URLPattern;
import com.wavemaker.commons.util.CoreFilterUtil;
import com.wavemaker.runtime.security.config.WMAppSecurityConfig;


/**
 * SSL Filter for Wavemaker Runtime.
 *
 * @author Arjun Sahasranam
 */
public class SSLSecureFilter extends GenericFilterBean {
    private static final Logger logger = LoggerFactory.getLogger(SSLSecureFilter.class);
    private SSLConfig sslConfig = new SSLConfig();
    private List<URLPattern> excludedUrlsList = null;
    @Autowired
    private WMAppSecurityConfig wmAppSecurityConfig;

    @Override
    protected void initFilterBean() throws ServletException {
        SSLConfig sslConfig = wmAppSecurityConfig.getSslConfig();
        if (sslConfig != null) {
            this.sslConfig = sslConfig;
            excludedUrlsList = CoreFilterUtil.extractExcludedUrlsList(this.sslConfig.getExcludedUrls());
            logger.info("SSLConfig set in filter {}", sslConfig);
        }
    }

    @Override
    public void doFilter(
            ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        if (sslConfig.isUseSSL()) {
            if (request.isSecure()) {
                filterChain.doFilter(request, response);
            } else if (CoreFilterUtil.isExcluded(request, excludedUrlsList)) {
                logger.debug("RequestURI {} is a excluded external request {}", request.getRequestURI());
                filterChain.doFilter(request, response);
            } else {
                String requestUri = request.getRequestURI();
                String queryStr = request.getQueryString();
                String uriWithQueryStr = requestUri + ((queryStr != null) ? ("?" + queryStr) : "");
                URL redirectUrl = new URL("https", request.getServerName(), sslConfig.getSslPort(), uriWithQueryStr);
                logger.debug("Redirecting current request {} to https request {}", requestUri, redirectUrl.toString());
                response.sendRedirect(redirectUrl.toExternalForm());
            }
        } else {
            filterChain.doFilter(request, response);
        }
    }

    public void destroy() {
    }
}
