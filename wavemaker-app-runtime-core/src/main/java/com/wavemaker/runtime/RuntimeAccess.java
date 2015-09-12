/**
 * Copyright (C) 2014 WaveMaker, Inc. All rights reserved.
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
package com.wavemaker.runtime;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.context.ApplicationContext;
import org.springframework.core.NamedThreadLocal;
import org.springframework.web.context.support.WebApplicationContextUtils;

import com.wavemaker.studio.common.WMRuntimeInitException;

/**
 * Runtime bean. Provides an interface to the session, request and response objects, and other WaveMaker interfaces.
 * This is the primary interface point for any WaveMaker system access.
 * 
 * This class supersedes the old AGRuntime class.
 * 
 * This should only be used as a bean property or through the static {@link #getInstance()} method; other instantiation
 * methods are unsupported. Using it as a bean property is recommended (see {@link #getInstance()} for more
 * information). The RuntimeAccess bean is named runtimeAccess, an example:
 * 
 * <pre>
 * &lt;bean id="myServiceBeanId" class="myServiceBeanClass"
 *          scope="singleton" lazy-init="true">
 *   &lt;property name="runtimeAccess">
 *       &lt;ref bean="runtimeAccess" />
 *   &lt;/property>
 * &lt;/bean>
 * </pre>
 * 
 * @author Matt Small
 */
@Deprecated
public class RuntimeAccess {

    private static ThreadLocal<RuntimeAccess> runtimeThreadLocal = new NamedThreadLocal<RuntimeAccess>("Wavemaker Runtime");

    private String projectId;

    private String projectRoot;

    private HttpServletRequest request = null;

    private HttpServletResponse response = null;

    private long startTime;

    private ApplicationContext appContext;

    /**
     * Do not use this constructor; instead, use either {@link #getInstance()} or access this class through bean
     * properties.
     */
    public RuntimeAccess() {
    }

    /**
     * Statically return the current instance of RuntimeAccess. This depends on the Spring bean being already loaded.
     * 
     * This will only return valid values after a request has already been initialized; for this reason, it is
     * inappropriate to use this in a constructor or static initializer. Either call {@link #getInstance()} in your
     * service call, or use a Spring property on your service class to reference the runtime bean. Using a Spring
     * property is recommended.
     * 
     * @return The RuntimeAccess instance.
     */
    public static RuntimeAccess getInstance() {
        RuntimeAccess runtimeAccess = runtimeThreadLocal.get();
        if (runtimeAccess == null) {
            throw new WMRuntimeInitException("RuntimeAccess uninitialized; request init failed.");
        }
        return runtimeAccess;
    }

    /**
     * Get the current HttpServletRequest. This call is only valid after the request has been initialized.
     * 
     * @return The current request.
     */
    public HttpServletRequest getRequest() {
        return this.request;
    }

    public void setRequest(HttpServletRequest request) {
        this.request = request;
    }

    /*
     * public void setTenantId(int val) { this.getSession().setAttribute(CommonConstants.LOGON_TENANT_ID, val); }
     *
     * public int getTenantId() { Object o = this.getSession().getAttribute(CommonConstants.LOGON_TENANT_ID); if (o ==
     * null) { return -1; }
     *
     * return (Integer) o; }
     */

    public Object getSpringBean(String beanId) {
        if (this.appContext == null) {
            if (this.request == null) {
                return null;
            }
            ServletContext context = this.request.getSession().getServletContext();
            appContext = WebApplicationContextUtils.getWebApplicationContext(context);
        }
        return appContext.getBean(beanId);
    }

    public void setResponse(HttpServletResponse response) {
        this.response = response;
    }

    public HttpServletResponse getResponse() {
        return this.response;
    }

    public void setStartTime(long startTime) {
        this.startTime = startTime;
    }

    public long getStartTime() {
        return this.startTime;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectRoot() {
        return projectRoot;
    }

    public void setProjectRoot(String projectRoot) {
        this.projectRoot = projectRoot;
    }

    public void setApplicationContext(ApplicationContext context) {
        this.appContext = context;
    }
}